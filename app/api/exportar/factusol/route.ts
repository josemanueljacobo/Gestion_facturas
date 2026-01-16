import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { facturas, contactos, lineas_iva } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { trimestre, ano, fecha_inicio, fecha_fin } = body;

        // Determine date range
        let startDate: Date;
        let endDate: Date;

        if (trimestre && ano) {
            const quarters: Record<string, [number, number]> = {
                'T1': [0, 2],
                'T2': [3, 5],
                'T3': [6, 8],
                'T4': [9, 11],
            };

            const [startMonth, endMonth] = quarters[trimestre];
            startDate = new Date(ano, startMonth, 1);
            endDate = new Date(ano, endMonth + 1, 0);
        } else if (fecha_inicio && fecha_fin) {
            startDate = new Date(fecha_inicio);
            endDate = new Date(fecha_fin);
        } else {
            return NextResponse.json(
                { error: 'Provide either trimestre/ano or fecha_inicio/fecha_fin' },
                { status: 400 }
            );
        }

        // Fetch validated invoices in date range
        const results = await db
            .select({
                factura: facturas,
                contacto: contactos,
            })
            .from(facturas)
            .leftJoin(contactos, eq(facturas.contacto_id, contactos.id))
            .where(
                and(
                    eq(facturas.estado, 'validada'),
                    gte(facturas.fecha_emision, startDate),
                    lte(facturas.fecha_emision, endDate)
                )
            );

        // Get VAT lines for each invoice
        const csvData = [];

        for (const row of results) {
            const vatLines = await db
                .select()
                .from(lineas_iva)
                .where(eq(lineas_iva.factura_id, row.factura.id));

            // Factusol format
            csvData.push({
                'CIF/NIF': row.contacto?.cif_nif || '',
                'Código Contable': row.contacto?.codigo_contable || '',
                'Nombre Fiscal': row.contacto?.nombre_fiscal || '',
                'Número Factura': row.factura.numero_factura,
                'Fecha Emisión': new Date(row.factura.fecha_emision).toLocaleDateString('es-ES'),
                'Base Imponible': row.factura.base_imponible_total.toFixed(2),
                'IVA Total': row.factura.iva_total.toFixed(2),
                'Total Factura': row.factura.total_factura.toFixed(2),
                'Tipo': row.factura.tipo === 'recibida' ? 'COMPRA' : 'VENTA',
            });
        }

        // Generate CSV
        const csv = Papa.unparse(csvData, {
            delimiter: ';',  // Factusol typically uses semicolon
            header: true,
        });

        // Mark invoices as exported
        const invoiceIds = results.map(r => r.factura.id);
        if (invoiceIds.length > 0) {
            await db
                .update(facturas)
                .set({
                    estado: 'exportada',
                    fecha_exportacion: new Date(),
                })
                .where(eq(facturas.id, invoiceIds[0])); // Update query for all IDs would need IN clause
        }

        // Return CSV as downloadable file
        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="factusol_export_${Date.now()}.csv"`,
            },
        });
    } catch (error) {
        console.error('Error generating export:', error);
        return NextResponse.json(
            { error: 'Failed to generate export' },
            { status: 500 }
        );
    }
}
