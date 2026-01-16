import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { facturas, contactos, departamentos } from '@/lib/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { invoiceIds } = body;

        let query = db
            .select({
                factura: facturas,
                contacto: contactos,
                departamento: departamentos,
            })
            .from(facturas)
            .leftJoin(contactos, eq(facturas.contacto_id, contactos.id))
            .leftJoin(departamentos, eq(facturas.departamento_id, departamentos.id));

        if (invoiceIds && invoiceIds.length > 0) {
            query = query.where(inArray(facturas.id, invoiceIds));
        }

        const results = await query.orderBy(desc(facturas.fecha_emision));

        // ... (existing update logic) ...
        const processedIds = results.map(r => r.factura.id);
        if (processedIds.length > 0) {
            await db.update(facturas)
                .set({ estado: 'exportada', fecha_exportacion: new Date() })
                .where(inArray(facturas.id, processedIds));
        }

        const rows = results.map((row, index) => {
            const f = row.factura;
            const c = row.contacto;
            const d = row.departamento;

            // ... (existing supplierCode logic) ...
            let supplierCode = 0;
            if (c?.codigo_contable) {
                const parts = c.codigo_contable.split('.');
                const last = parts[parts.length - 1];
                supplierCode = parseInt(last, 10) || 0;
            } else {
                supplierCode = 40000;
            }

            const data: any = {};
            // ... (existing mappings A-P) ...
            data['A'] = 1;
            data['B'] = index + 1;
            data['C'] = f.numero_factura.slice(0, 20);
            data['D'] = f.numero_factura;
            data['E'] = f.fecha_emision;
            data['F'] = supplierCode;
            data['G'] = 0;
            data['I'] = c?.nombre_fiscal?.slice(0, 50) || '';
            data['N'] = c?.cif_nif || '';
            data['O'] = 0;
            data['P'] = f.recargo_equivalencia ? 1 : 0;

            // ... (existing totals AS, AV, AY) ...
            data['AS'] = f.base_imponible_total;
            let percent = 0;
            if (f.base_imponible_total > 0 && f.iva_total > 0) {
                percent = (f.iva_total / f.base_imponible_total) * 100;
                if (Math.abs(percent - 21) < 0.5) percent = 21;
                else if (Math.abs(percent - 10) < 0.5) percent = 10;
                else if (Math.abs(percent - 4) < 0.5) percent = 4;
            }
            data['AV'] = Math.round(percent);
            data['AY'] = f.iva_total;

            if (f.recargo_equivalencia) {
                if (data['AV'] === 21) { data['BB'] = 5.20; data['BE'] = Number((f.base_imponible_total * 0.052).toFixed(2)); }
                else if (data['AV'] === 10) { data['BB'] = 1.40; data['BE'] = Number((f.base_imponible_total * 0.014).toFixed(2)); }
                else if (data['AV'] === 4) { data['BB'] = 0.50; data['BE'] = Number((f.base_imponible_total * 0.005).toFixed(2)); }
            }

            // ... (existing CK-CO) ...
            data['CK'] = f.bien_inversion ? 1 : 0;
            data['CM'] = f.tipo_retencion || 0;
            data['CN'] = f.clave_operacion || 0;

            if (f.fecha_operacion) {
                data['CO'] = new Date(f.fecha_operacion);
            }

            // CP: Departamento (Numeric Code)
            if (d?.codigo) {
                data['CP'] = d.codigo;
            }

            return data;
        });

        const excelRows = rows.map(r => {
            const rowArray = new Array(120).fill(''); // Expanded size for CP

            if (r['A']) rowArray[0] = r['A'];
            if (r['B']) rowArray[1] = r['B'];
            if (r['C']) rowArray[2] = r['C'];
            if (r['D']) rowArray[3] = r['D'];
            if (r['E']) rowArray[4] = r['E'];
            if (r['F']) rowArray[5] = r['F'];
            if (r['G']) rowArray[6] = r['G'];
            if (r['I']) rowArray[8] = r['I'];
            if (r['N']) rowArray[13] = r['N'];
            if (r['O']) rowArray[14] = r['O'];
            if (r['P'] !== undefined) rowArray[15] = r['P'];

            if (r['AS']) rowArray[44] = r['AS'];
            if (r['AV']) rowArray[47] = r['AV'];
            if (r['AY']) rowArray[50] = r['AY'];

            if (r['BB']) rowArray[53] = r['BB'];
            if (r['BE']) rowArray[56] = r['BE'];

            if (r['CK']) rowArray[88] = r['CK'];
            if (r['CM']) rowArray[90] = r['CM'];
            if (r['CN']) rowArray[91] = r['CN'];
            if (r['CO']) rowArray[92] = r['CO'];

            // CP: Departamento (Index 93)
            if (r['CP']) rowArray[93] = r['CP'];

            return rowArray;
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelRows);
        XLSX.utils.book_append_sheet(wb, ws, 'Facturas');


        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xls' }); // .xls for older compatibility per PDF

        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Disposition': 'attachment; filename="FRE.xls"',
                'Content-Type': 'application/vnd.ms-excel',
            },
        });

    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
    }
}
