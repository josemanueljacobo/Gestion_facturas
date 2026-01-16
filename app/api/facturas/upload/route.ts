import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { extractInvoiceData } from '@/lib/services/ai-extraction';
import { db } from '@/lib/db';
import { contactos, facturas, lineas_iva } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        const acceptedTypes = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg',
        ];

        if (!acceptedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Only PDF, PNG, and JPG are allowed.' },
                { status: 400 }
            );
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${timestamp}-${file.name}`;
        const filepath = path.join(uploadsDir, filename);

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        // Try to extract data using AI (optional - will skip if no API key)
        let extractedData: any = {
            cif_nif: '',
            nombre_empresa: '',
            numero_factura: '',
            fecha_emision: new Date().toISOString().split('T')[0],
            base_imponible: 0,
            iva_cuota: 0,
            total: 0,
            lineas_iva: [],
            confidence: 0,
            fieldConfidence: {},
            error: null // Added error field
        };

        try {
            if (process.env.GEMINI_API_KEY) {
                extractedData = await extractInvoiceData(buffer, file.type);
            } else {
                console.warn('GEMINI_API_KEY not configured - skipping AI extraction');
                extractedData.error = 'GEMINI_API_KEY_MISSING';
            }
        } catch (aiError: any) {
            console.error('AI extraction failed:', aiError);
            console.warn('Continuing with manual data entry');
            extractedData.error = 'EXTRACTION_FAILED';
            extractedData.errorDetails = aiError.message;
        }

        // Try to match CIF with existing contact, or create new one
        let contacto_id = null;

        // Helper to normalize strings for comparison
        const normalize = (str: string) => str ? str.trim().toUpperCase() : '';
        const cleanCif = normalize(extractedData.cif_nif).replace(/[^A-Z0-9]/g, '');

        if (cleanCif) {
            // Try to find by normalized CIF (ignoring separators and case)
            // SQLite specific: UPPER and REPLACE
            const [contact] = await db
                .select()
                .from(contactos)
                .where(
                    sql`UPPER(REPLACE(REPLACE(${contactos.cif_nif}, '-', ''), ' ', '')) = ${cleanCif}`
                )
                .limit(1);

            if (contact) {
                contacto_id = contact.id;
                console.log(`Contact matched by CIF: ${cleanCif} -> ${contact.nombre_fiscal}`);
            }
        }

        // Fallback: Try to find by Name if CIF didn't match
        if (!contacto_id && extractedData.nombre_empresa) {
            const cleanName = normalize(extractedData.nombre_empresa);
            const [contactByName] = await db
                .select()
                .from(contactos)
                .where(
                    sql`UPPER(${contactos.nombre_fiscal}) = ${cleanName} OR UPPER(${contactos.nombre_comercial}) = ${cleanName}`
                )
                .limit(1);

            if (contactByName) {
                contacto_id = contactByName.id;
                console.log(`Contact matched by Name: ${cleanName} -> ${contactByName.nombre_fiscal}`);

                // Optional: Update CIF if missing in DB? Skip for now to avoid overwriting.
            }
        }

        // Create new if still not found
        if (!contacto_id && (extractedData.cif_nif || extractedData.nombre_empresa)) {
            console.log('Creating new contact:', extractedData.nombre_empresa);
            const [newContact] = await db.insert(contactos).values({
                tipo: 'proveedor',
                cif_nif: extractedData.cif_nif || `TEMP-${Date.now()}`, // Ensure unique constraint isn't violated by empty
                nombre_fiscal: extractedData.nombre_empresa || 'Proveedor Desconocido',
                nombre_comercial: extractedData.nombre_empresa || 'Proveedor Desconocido',
            }).returning();
            contacto_id = newContact.id;
        }

        // Check for duplicate invoice
        let isDuplicate = false;
        let existingInvoiceId = null;

        if (contacto_id && extractedData.numero_factura) {
            const [existingInvoice] = await db
                .select()
                .from(facturas)
                .where(
                    and(
                        eq(facturas.contacto_id, contacto_id),
                        eq(facturas.numero_factura, extractedData.numero_factura)
                    )
                )
                .limit(1);

            if (existingInvoice) {
                isDuplicate = true;
                existingInvoiceId = existingInvoice.id;
                console.log(`Duplicate invoice detected: ${extractedData.numero_factura} for contact ${contacto_id}`);
            }
        }

        let invoiceIdToReturn = existingInvoiceId;
        let newInvoice = null;

        if (!isDuplicate) {
            // Create invoice in database immediately with pending status
            const [createdInvoice] = await db.insert(facturas).values({
                tipo: 'recibida',
                contacto_id: contacto_id,
                numero_factura: extractedData.numero_factura || `TEMP-${timestamp}`,
                fecha_emision: extractedData.fecha_emision
                    ? new Date(extractedData.fecha_emision)
                    : new Date(),
                estado: 'pendiente_revision',
                base_imponible_total: extractedData.base_imponible || 0,
                iva_total: extractedData.iva_cuota || 0,
                total_factura: extractedData.total || 0,
                url_archivo_pdf: `/uploads/${filename}`,
                json_ia_raw: extractedData,
                nivel_confianza: extractedData.confidence || 0,
                recargo_equivalencia: extractedData.recargo_equivalencia || false,
                porcentaje_retencion: extractedData.porcentaje_retencion || 0,
                importe_retencion: extractedData.importe_retencion || 0,
            }).returning();

            newInvoice = createdInvoice;
            invoiceIdToReturn = createdInvoice.id;

            // Create VAT lines if provided
            if (extractedData.lineas_iva && extractedData.lineas_iva.length > 0) {
                await db.insert(lineas_iva).values(
                    extractedData.lineas_iva.map((linea: any) => ({
                        factura_id: createdInvoice.id,
                        base_imponible: linea.base_imponible,
                        porcentaje_iva: linea.porcentaje_iva,
                        cuota_iva: linea.cuota_iva,
                    }))
                );
            }
        }

        // Return result
        return NextResponse.json({
            success: true,
            invoiceId: invoiceIdToReturn,
            fileUrl: `/uploads/${filename}`,
            isDuplicate: isDuplicate,
            message: isDuplicate ? 'Factura duplicada detectada' : 'Factura procesada correctamente'
        });
    } catch (error) {
        console.error('Error processing upload:', error);
        return NextResponse.json(
            { error: 'Failed to process file' },
            { status: 500 }
        );
    }
}

// Increase max body size for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};
