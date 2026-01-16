import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contactos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';

interface ContactRow {
    tipo?: string;
    cif_nif?: string;
    nombre_fiscal?: string;
    nombre_comercial?: string;
    codigo_contable?: string;
    email?: string;
    direccion?: string;
    pais_iso?: string;
}

// Normalize column names to handle different variations
function normalizeColumnName(col: string): string {
    const normalized = col.toLowerCase().trim()
        .replace(/\s+/g, '_')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove accents

    // Map common variations
    const mappings: Record<string, string> = {
        'type': 'tipo',
        'nif': 'cif_nif',
        'cif': 'cif_nif',
        'nif_cif': 'cif_nif',
        'nombre': 'nombre_fiscal',
        'razon_social': 'nombre_fiscal',
        'razon social': 'nombre_fiscal',
        'nombre_comercial': 'nombre_comercial',
        'comercial': 'nombre_comercial',
        'codigo': 'codigo_contable',
        'cuenta': 'codigo_contable',
        'codigo_contable': 'codigo_contable',
        'mail': 'email',
        'correo': 'email',
        'address': 'direccion',
        'country': 'pais_iso',
        'pais': 'pais_iso',
    };

    return mappings[normalized] || normalized;
}

// Parse and normalize a row of data
function parseRow(row: Record<string, any>): ContactRow {
    const result: ContactRow = {};

    for (const [key, value] of Object.entries(row)) {
        const normalizedKey = normalizeColumnName(key);
        if (value !== undefined && value !== null && value !== '') {
            (result as any)[normalizedKey] = String(value).trim();
        }
    }

    // Normalize tipo value
    if (result.tipo) {
        const tipo = result.tipo.toLowerCase();
        if (tipo.includes('prov') || tipo === 'p' || tipo === 'supplier') {
            result.tipo = 'proveedor';
        } else if (tipo.includes('client') || tipo === 'c' || tipo === 'customer') {
            result.tipo = 'cliente';
        }
    }

    return result;
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const isPreview = formData.get('preview') === 'true';

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Read file content
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

        // Parse and normalize rows
        const rows = rawData.map(parseRow);

        // If preview mode, just return the parsed data
        if (isPreview) {
            return NextResponse.json({ preview: rows });
        }

        // Process import
        const result = {
            success: 0,
            duplicates: [] as string[],
            errors: [] as string[],
        };

        for (const row of rows) {
            try {
                // Validate required fields
                if (!row.cif_nif || !row.nombre_fiscal) {
                    result.errors.push(`Fila sin CIF/NIF o nombre fiscal: ${JSON.stringify(row)}`);
                    continue;
                }

                // Validate tipo
                if (!row.tipo || !['proveedor', 'cliente'].includes(row.tipo)) {
                    row.tipo = 'proveedor'; // Default to proveedor
                }

                // Check for duplicates
                const existing = await db
                    .select()
                    .from(contactos)
                    .where(eq(contactos.cif_nif, row.cif_nif))
                    .limit(1);

                if (existing.length > 0) {
                    result.duplicates.push(row.cif_nif);
                    continue;
                }

                // Insert contact
                await db.insert(contactos).values({
                    tipo: row.tipo as 'proveedor' | 'cliente',
                    cif_nif: row.cif_nif,
                    nombre_fiscal: row.nombre_fiscal,
                    nombre_comercial: row.nombre_comercial || null,
                    codigo_contable: row.codigo_contable || null,
                    email: row.email || null,
                    direccion: row.direccion || null,
                    pais_iso: row.pais_iso || 'ES',
                });

                result.success++;
            } catch (err: any) {
                result.errors.push(`Error en ${row.cif_nif}: ${err.message}`);
            }
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error importing contacts:', error);
        return NextResponse.json(
            { error: 'Failed to import contacts', details: error.message },
            { status: 500 }
        );
    }
}
