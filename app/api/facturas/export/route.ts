import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { facturas, contactos, lineas_iva } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { invoiceIds } = body;

        if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
            return NextResponse.json({ error: 'No invoice IDs provided' }, { status: 400 });
        }

        // Fetch invoices with contacts
        const results = await db
            .select({
                factura: facturas,
                contacto: contactos,
            })
            .from(facturas)
            .leftJoin(contactos, eq(facturas.contacto_id, contactos.id))
            .where(inArray(facturas.id, invoiceIds));

        // Prepare Excel data with official Factusol format (76 columns A-CT)
        const excelData = [];

        for (const row of results) {
            // Get VAT lines for this invoice
            const vatLines = await db
                .select()
                .from(lineas_iva)
                .where(eq(lineas_iva.factura_id, row.factura.id));

            // Format date as DD/MM/YYYY
            const fechaEmision = new Date(row.factura.fecha_emision);
            const fechaFormateada = `${fechaEmision.getDate().toString().padStart(2, '0')}/${(fechaEmision.getMonth() + 1).toString().padStart(2, '0')}/${fechaEmision.getFullYear()}`;

            // Extract invoice number (6 digits)
            const numeroDocumento = row.factura.numero_factura.replace(/\D/g, '').slice(-6).padStart(6, '0');

            // Prepare VAT data (up to 3 VAT lines)
            const baseImponible1 = vatLines[0]?.base_imponible || 0;
            const porcentajeIva1 = vatLines[0]?.porcentaje_iva || 0;
            const importeIva1 = vatLines[0]?.cuota_iva || 0;

            const baseImponible2 = vatLines[1]?.base_imponible || 0;
            const porcentajeIva2 = vatLines[1]?.porcentaje_iva || 0;
            const importeIva2 = vatLines[1]?.cuota_iva || 0;

            const baseImponible3 = vatLines[2]?.base_imponible || 0;
            const porcentajeIva3 = vatLines[2]?.porcentaje_iva || 0;
            const importeIva3 = vatLines[2]?.cuota_iva || 0;

            // Factusol FRE.xls format - All required columns (A-CT)
            const facturaRow: any = {
                // Column A: Tipo de documento
                'A': 1,
                // Column B: Número de documento (6 digits)
                'B': numeroDocumento,
                // Column C: Código exterior
                'C': row.factura.numero_factura,
                // Column D: Referencia
                'D': '',
                // Column E: Fecha
                'E': fechaFormateada,
                // Column F: Proveedor (5 digits)
                'F': row.contacto?.codigo_contable?.slice(0, 5) || '',
                // Column G: Estado (0=Pendiente, 1=Pagado parcial, 2=Pagado)
                'G': 0,
                // Column H: Código de cliente
                'H': '',
                // Column I: Nombre del proveedor
                'I': (row.contacto?.nombre_fiscal || '').slice(0, 50),
                // Column J: Domicilio
                'J': (row.contacto?.direccion || '').slice(0, 100),
                // Column K: Población
                'K': '',
                // Column L: Código postal
                'L': '',
                // Column M: Provincia
                'M': '',
                // Column N: N.I.F.
                'N': (row.contacto?.cif_nif || '').slice(0, 18),
                // Column O: Tipo de IVA
                'O': 0,
                // Column P: Recargo de equivalencia
                'P': 0,
                // Column Q: Teléfono
                'Q': '',
                // Columns R-AR: Descuentos, pronto pago, portes, financiación (empty/0)
                'R': '', 'S': '', 'T': '', 'U': '', 'V': '', 'W': '', 'X': '', 'Y': '', 'Z': '',
                'AA': '', 'AB': '', 'AC': '', 'AD': '', 'AE': '', 'AF': '', 'AG': '', 'AH': '',
                'AI': '', 'AJ': '', 'AK': '', 'AL': '', 'AM': '', 'AN': '', 'AO': '', 'AP': '',
                'AQ': '', 'AR': '',
                // Columns AS-AU: Base imponible 1, 2, 3
                'AS': baseImponible1 > 0 ? baseImponible1.toFixed(2) : '',
                'AT': baseImponible2 > 0 ? baseImponible2.toFixed(2) : '',
                'AU': baseImponible3 > 0 ? baseImponible3.toFixed(2) : '',
                // Columns AV-AX: Porcentaje de IVA 1, 2, 3
                'AV': porcentajeIva1 > 0 ? (porcentajeIva1 / 100).toFixed(2) : '',
                'AW': porcentajeIva2 > 0 ? (porcentajeIva2 / 100).toFixed(2) : '',
                'AX': porcentajeIva3 > 0 ? (porcentajeIva3 / 100).toFixed(2) : '',
                // Columns AY-BA: Importe de IVA 1, 2, 3
                'AY': importeIva1 > 0 ? importeIva1.toFixed(2) : '',
                'AZ': importeIva2 > 0 ? importeIva2.toFixed(2) : '',
                'BA': importeIva3 > 0 ? importeIva3.toFixed(2) : '',
                // Columns BB-BG: Recargo de equivalencia (empty/0)
                'BB': '', 'BC': '', 'BD': '', 'BE': '', 'BF': '', 'BG': '',
                // Columns BH-BI: Retención
                'BH': '', 'BI': '',
                // Column BJ: Total
                'BJ': row.factura.total_factura.toFixed(2),
                // Column BK: Forma de pago
                'BK': '',
                // Columns BL-BM: Observaciones
                'BL': '', 'BM': '',
                // Column BN: Traspasada a contabilidad
                'BN': 0,
                // Columns BO-BS: Fecha entrega, portes, agencia
                'BO': '', 'BP': '', 'BQ': '', 'BR': '', 'BS': '',
                // Column BT: Comentarios
                'BT': '',
                // Column BU: Factura deducible
                'BU': 0,
                // Columns BV-BW: Usuario
                'BV': '', 'BW': '',
                // Column BX: Almacén
                'BX': '',
                // Columns BY-CH: Campos exentos
                'BY': '', 'BZ': '', 'CA': '', 'CB': '', 'CC': '', 'CD': '', 'CE': '', 'CF': '',
                'CG': '', 'CH': '',
                // Columns CI-CJ: Enviado por mail, Proveedor/Acreedor
                'CI': 0, 'CJ': 0,
                // Columns CK-CT: Otros campos
                'CK': 0, 'CL': '', 'CM': 0, 'CN': 0, 'CO': '', 'CP': '', 'CQ': 0, 'CR': 0,
                'CS': '', 'CT': '',
            };

            excelData.push(facturaRow);
        }

        // Check if there are invoices to export
        if (excelData.length === 0) {
            return NextResponse.json(
                { error: 'No hay facturas para exportar' },
                { status: 400 }
            );
        }

        // Create Excel workbook with explicit column headers (A-CT)
        const columnHeaders = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q',
            'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF',
            'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT',
            'AU', 'AV', 'AW', 'AX', 'AY', 'AZ', 'BA', 'BB', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH',
            'BI', 'BJ', 'BK', 'BL', 'BM', 'BN', 'BO', 'BP', 'BQ', 'BR', 'BS', 'BT', 'BU', 'BV',
            'BW', 'BX', 'BY', 'BZ', 'CA', 'CB', 'CC', 'CD', 'CE', 'CF', 'CG', 'CH', 'CI', 'CJ',
            'CK', 'CL', 'CM', 'CN', 'CO', 'CP', 'CQ', 'CR', 'CS', 'CT'];

        const worksheet = XLSX.utils.json_to_sheet(excelData, {
            header: columnHeaders,
            skipHeader: true
        });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Facturas');

        // Generate Excel file
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
