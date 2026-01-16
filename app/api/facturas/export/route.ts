import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { facturas, contactos, lineas_iva, departamentos } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { invoiceIds } = body;

        if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
            return NextResponse.json({ error: 'No invoice IDs provided' }, { status: 400 });
        }

        // Fetch invoices with contacts, departments and lines
        const invoicesData = await db
            .select({
                factura: facturas,
                contacto: contactos,
                departamento: departamentos,
            })
            .from(facturas)
            .leftJoin(contactos, eq(facturas.contacto_id, contactos.id))
            .leftJoin(departamentos, eq(facturas.departamento_id, departamentos.id))
            .where(inArray(facturas.id, invoiceIds));

        const allLines = await db
            .select()
            .from(lineas_iva)
            .where(inArray(lineas_iva.factura_id, invoiceIds));

        // Prepare data for Factusol
        // Note: Factusol import formats vary, but a common one for Received Invoices (FRE) 
        // involves multiple bases/ivas on the same row.

        // Prepare data for Factusol
        const exportData = invoicesData.map(row => {
            const f = row.factura;
            const c = row.contacto;
            const d = row.departamento;
            let lines = allLines.filter(l => l.factura_id === f.id);

            // Fallback: If no detailed lines but invoice has totals, create a surrogate line
            if (lines.length === 0 && (f.base_imponible_total > 0 || f.iva_total > 0)) {
                let calculatedPct = 0;
                if (f.base_imponible_total > 0) {
                    calculatedPct = Math.round((f.iva_total / f.base_imponible_total) * 100);
                    // Standardize to common VAT rates if very close
                    if (Math.abs(calculatedPct - 21) <= 1) calculatedPct = 21;
                    else if (Math.abs(calculatedPct - 10) <= 1) calculatedPct = 10;
                    else if (Math.abs(calculatedPct - 4) <= 1) calculatedPct = 4;
                }

                lines = [{
                    id: 'fallback',
                    factura_id: f.id,
                    base_imponible: f.base_imponible_total,
                    porcentaje_iva: calculatedPct,
                    cuota_iva: f.iva_total,
                    porcentaje_recargo: 0,
                    cuota_recargo: 0,
                } as any];
            }

            // Factusol standard usually has columns for up to 3 context lines
            const data: any = {
                'ID': f.asiento_contable_id || '',
                'FECHA': f.fecha_emision ? new Date(f.fecha_emision).toLocaleDateString('es-ES') : '',
                'FACTURA': f.numero_factura,
                'PROVEEDOR': c?.cif_nif || '',
                'NOMBRE': c?.nombre_fiscal || '',
                'DEP': d?.codigo || '', // Departamento factura
                'BASE1': lines[0]?.base_imponible || 0,
                'IVA1': lines[0]?.porcentaje_iva || 0,
                'CUOTA1': lines[0]?.cuota_iva || 0,
                'RE1': lines[0]?.porcentaje_recargo || 0,
                'CRE1': lines[0]?.cuota_recargo || 0,
                'BASE2': lines[1]?.base_imponible || 0,
                'IVA2': lines[1]?.porcentaje_iva || 0,
                'CUOTA2': lines[1]?.cuota_iva || 0,
                'RE2': lines[1]?.porcentaje_recargo || 0,
                'CRE2': lines[1]?.cuota_recargo || 0,
                'BASE3': lines[2]?.base_imponible || 0,
                'IVA3': lines[2]?.porcentaje_iva || 0,
                'CUOTA3': lines[2]?.cuota_iva || 0,
                'RE3': lines[2]?.porcentaje_recargo || 0,
                'CRE3': lines[2]?.cuota_recargo || 0,
                'RET_BI': f.base_imponible_total,
                'RET_POR': f.porcentaje_retencion || 0,
                'RET_IMP': f.importe_retencion || 0,
                'TOTAL': f.total_factura,
                'CLAVE': f.clave_operacion || '',
                'BIEN_INV': f.bien_inversion ? 'S' : 'N',
                'TIPO_RET': f.tipo_retencion || 0
            };

            return data;
        });

        // Create Excel workbook
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Facturas');

        // Generate buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xls' });

        // Update status of invoices to 'exportada'
        await db.update(facturas)
            .set({
                estado: 'exportada',
                fecha_exportacion: new Date(),
                updated_at: new Date()
            })
            .where(inArray(facturas.id, invoiceIds));

        // Return the file
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.ms-excel',
                'Content-Disposition': 'attachment; filename="FRE.xls"',
            },
        });

    } catch (error) {
        console.error('Export Error:', error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
