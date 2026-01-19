import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ExtractedInvoiceData {
    cif_nif: string;
    nombre_empresa: string;
    numero_factura: string;
    fecha_emision: string;
    base_imponible: number;
    iva_porcentaje: number;
    iva_cuota: number;
    total: number;
    lineas_iva: Array<{
        base_imponible: number;
        porcentaje_iva: number;
        cuota_iva: number;
    }>;
    recargo_equivalencia: boolean;
    porcentaje_retencion: number;
    importe_retencion: number;
    confidence: number;
    fieldConfidence: Record<string, number>;
}

export async function extractInvoiceData(
    fileBuffer: Buffer,
    mimeType: string,
    empresaCif?: string
): Promise<ExtractedInvoiceData> {
    // DEBUG: Check API Key loading
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('DEBUG: API Key loaded:', apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 3)}` : 'UNDEFINED');

    try {
        console.log(`Starting AI extraction for file type: ${mimeType}, size: ${fileBuffer.length} bytes`);
        const modelsToTry = [
            'gemini-2.0-flash', // Use available 2.0 version
            'gemini-2.0-flash-lite',   // Fallback
        ];

        let data: ExtractedInvoiceData | null = null;
        let lastError = null;
        let quotaError = null;

        const prompt = `Analiza esta factura y extrae los siguientes datos en formato JSON: ... `; // Abbreviated for tool call, keep clear

        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting extraction with model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });

                // Build prompt with empresa CIF instruction if provided
                const empresaCifInstruction = empresaCif
                    ? `\n\nATENCIÓN CRÍTICA: Si encuentras el CIF "${empresaCif}" en el documento, ese es el CIF de la empresa CLIENTE/DESTINATARIO. NO es el CIF que debes extraer. Debes buscar OTRO CIF DIFERENTE que sea del PROVEEDOR/EMISOR de la factura. El proveedor es quien emite la factura, no quien la recibe.\n`
                    : '';

                const result = await model.generateContent([
                    `Analiza esta factura y extrae los siguientes datos en formato JSON:
    
{
  "cif_nif": "CIF o NIF del emisor (proveedor)",
  "nombre_empresa": "Nombre fiscal o comercial de la empresa",
  "numero_factura": "Número de la factura",
  "fecha_emision": "Fecha de emisión en formato YYYY-MM-DD",
  "base_imponible": número (base imponible total sin IVA),
  "iva_porcentaje": número (porcentaje de IVA principal, ej: 21),
  "iva_cuota": número (cuota de IVA total),
  "total": número (importe total con IVA),
  "lineas_iva": [
    {
      "base_imponible": número,
      "porcentaje_iva": número,
      "cuota_iva": número
    }
  ],
  "recargo_equivalencia": boolean (true si hay recargo de equivalencia aplicado, false si no),
  "porcentaje_retencion": número (porcentaje de IRPF si aplica, ej: 15. Si no, 0),
  "importe_retencion": número (importe total de la retención IRPF. Si no, 0)
}
${empresaCifInstruction}
Instrucciones críticas:
- El "cif_nif" debe ser del PROVEEDOR/EMISOR (quien emite la factura), NO del cliente/destinatario
- Si la factura tiene múltiples tipos de IVA (21%, 10%, 4%), incluye todas las líneas en "lineas_iva"
- Los números deben ser valores numéricos, no strings
- El CIF debe tener formato español (letra + 8 dígitos) si es posible
- Si algún campo no está claro, haz tu mejor estimación
- NO incluyas símbolos de moneda en los números
- Responde ÚNICAMENTE con el JSON, sin texto adicional`,
                    {
                        inlineData: {
                            data: fileBuffer.toString('base64'),
                            mimeType,
                        },
                    },
                ]);

                const response = await result.response;
                const text = response.text();

                // Clean up JSON string (remove markdown code blocks if present)
                let jsonString = text;
                const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (markdownMatch) {
                    jsonString = markdownMatch[1];
                } else {
                    const start = text.indexOf('{');
                    const end = text.lastIndexOf('}');
                    if (start !== -1 && end !== -1) {
                        jsonString = text.substring(start, end + 1);
                    }
                }

                console.log('--- RAW AI RESPONSE START ---');
                console.log(jsonString);
                console.log('--- RAW AI RESPONSE END ---');

                // CRITICAL FIX: Parse the JSON string!
                try {
                    data = JSON.parse(jsonString);
                    console.log('JSON parsed successfully:', data);
                } catch (parseError) {
                    console.error('JSON Parse Error:', parseError);
                    console.log('Offending JSON string:', jsonString);
                    throw new Error('Failed to parse AI response as JSON');
                }

                // VALIDATE: Check if extracted CIF matches empresa CIF
                if (empresaCif && data && data.cif_nif) {
                    const normalizeForComparison = (cif: string) => cif.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                    const extractedCifNormalized = normalizeForComparison(data.cif_nif);
                    const empresaCifNormalized = normalizeForComparison(empresaCif);

                    if (extractedCifNormalized === empresaCifNormalized) {
                        console.warn(`⚠️  WARNING: AI extracted empresa CIF (${empresaCif}) instead of supplier CIF!`);
                        console.warn('This is likely incorrect. Setting confidence to 0.3 and flagging for review.');
                        // Lower confidence significantly to flag for manual review
                        if (data.confidence !== undefined) {
                            data.confidence = Math.min(data.confidence, 0.3);
                        }
                    }
                }

                // Validate JSON content quality
                // Sometimes Flash returns valid JSON but with empty string values.
                // We should reject this and try the next model.
                if (!data || (!data.cif_nif && !data.total && !data.numero_factura)) {
                    console.warn(`Model ${modelName} returned empty data. Retrying with next model...`);
                    console.warn('Empty Data object:', data);
                    lastError = new Error('Model returned empty data');
                    // If this was the last model, we might exit loop and fail later, or we need to not break here.
                    // Just continue to trigger retry.
                    continue;
                }

                console.log(`Success with model: ${modelName}`);
                break; // Exit loop on valid cycle

            } catch (error: any) {
                console.warn(`Model ${modelName} failed:`, error.message);
                if (error.response) {
                    console.error('Error details:', JSON.stringify(error.response, null, 2));
                }

                if (error.message.includes('429') || error.message.includes('Quota exceeded')) {
                    quotaError = error;
                }

                // Handle 503 Service Unavailable / Model overloaded - retry with backoff
                if (error.message.includes('503') || error.message.includes('overloaded')) {
                    console.log('Model overloaded, retrying with exponential backoff...');
                    const maxRetries = 3;
                    for (let retry = 0; retry < maxRetries; retry++) {
                        const waitTime = Math.pow(2, retry + 1) * 2000; // 4s, 8s, 16s
                        console.log(`Retry ${retry + 1}/${maxRetries} after ${waitTime}ms...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));

                        try {
                            const model = genAI.getGenerativeModel({ model: modelName });
                            const retryResult = await model.generateContent([
                                `Analiza esta factura y extrae los datos en formato JSON con campos: cif_nif, nombre_empresa, numero_factura, fecha_emision (YYYY-MM-DD), base_imponible, iva_cuota, total, lineas_iva, recargo_equivalencia, porcentaje_retencion, importe_retencion. Responde SOLO con JSON.`,
                                {
                                    inlineData: {
                                        data: fileBuffer.toString('base64'),
                                        mimeType,
                                    },
                                },
                            ]);

                            const retryText = (await retryResult.response).text();
                            let retryJson = retryText;
                            const retryMatch = retryText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                            if (retryMatch) {
                                retryJson = retryMatch[1];
                            } else {
                                const start = retryText.indexOf('{');
                                const end = retryText.lastIndexOf('}');
                                if (start !== -1 && end !== -1) {
                                    retryJson = retryText.substring(start, end + 1);
                                }
                            }

                            data = JSON.parse(retryJson);
                            if (data && (data.cif_nif || data.total || data.numero_factura)) {
                                console.log(`Retry ${retry + 1} succeeded!`);
                                break;
                            }
                        } catch (retryError: any) {
                            console.warn(`Retry ${retry + 1} failed:`, retryError.message);
                            if (retry === maxRetries - 1) {
                                lastError = retryError;
                            }
                        }
                    }

                    if (data) break; // Exit model loop if retry succeeded
                    continue; // Try next model if all retries failed
                }

                lastError = error;

                if (error.message.includes('API_KEY_INVALID')) {
                    throw new Error('La clave API de Gemini no es válida. Revisa tu archivo .env');
                }

                // If JSON parse failed, it will be caught here and we try next model

                await new Promise(resolve => setTimeout(resolve, 4000));
            }
        }

        if (!data) {
            console.error('All models failed. Last error:', lastError);
            if (quotaError) {
                throw new Error('Se ha excedido la cuota gratuita de la IA. Por favor, espera unos instantes e intenta de nuevo.');
            }
            throw lastError || new Error('No se pudo extraer datos de la factura con ningún modelo de IA disponible.');
        }

        // ... data is now populated ...

        // Calculate confidence based on field completeness
        const requiredFields = [
            'cif_nif',
            'nombre_empresa',
            'numero_factura',
            'fecha_emision',
            'total',
        ];

        const fieldConfidence: Record<string, number> = {};
        let totalConfidence = 0;

        for (const field of requiredFields) {
            const value = data[field as keyof ExtractedInvoiceData];
            let confidence = 0;

            if (value && value !== '' && value !== 0) {
                if (field === 'cif_nif') {
                    // Spanish CIF format validation
                    confidence = /^[A-Z]\d{8}$/i.test(value as string) ? 1.0 : 0.6;
                } else if (field === 'fecha_emision') {
                    confidence = /^\d{4}-\d{2}-\d{2}$/.test(value as string) ? 1.0 : 0.6;
                } else if (typeof value === 'number' && value > 0) {
                    confidence = 1.0;
                } else {
                    confidence = 0.8;
                }
            } else {
                confidence = 0.0;
            }

            fieldConfidence[field] = confidence;
            totalConfidence += confidence;
        }

        const overallConfidence = totalConfidence / requiredFields.length;

        return {
            ...data,
            confidence: overallConfidence,
            fieldConfidence,
        };
    } catch (error: any) {
        console.error('Error extracting invoice data:', error);
        // Propagate the specific error message to help with debugging
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(errorMessage);
    }
}
