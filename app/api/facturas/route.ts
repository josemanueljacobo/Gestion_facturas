import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { facturas, contactos, lineas_iva } from '@/lib/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

// GET /api/facturas - List invoices
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '50');
        const estado = searchParams.get('estado');
        const trimestre = searchParams.get('trimestre'); // T1, T2, T3, T4
        const empresaId = searchParams.get('empresa_id');
        const fechaDesde = searchParams.get('fecha_desde');
        const fechaHasta = searchParams.get('fecha_hasta');
        const proveedor = searchParams.get('proveedor');

        // Apply filters
        const { like, or } = await import('drizzle-orm');
        const conditions: any[] = [];
        if (estado) {
            conditions.push(eq(facturas.estado, estado as any));
        }

        if (empresaId) {
            conditions.push(eq(facturas.empresa_id, empresaId));
        }

        if (fechaDesde) {
            conditions.push(gte(facturas.fecha_emision, new Date(fechaDesde)));
        }

        if (fechaHasta) {
            const end = new Date(fechaHasta);
            end.setHours(23, 59, 59, 999);
            conditions.push(lte(facturas.fecha_emision, end));
        }

        if (trimestre) {
            const year = new Date().getFullYear();
            const quarters: Record<string, [number, number]> = {
                'T1': [0, 2],  // Jan-Mar
                'T2': [3, 5],  // Apr-Jun
                'T3': [6, 8],  // Jul-Sep
                'T4': [9, 11], // Oct-Dec
            };

            const [startMonth, endMonth] = quarters[trimestre] || [0, 11];
            const startDate = new Date(year, startMonth, 1);
            const endDate = new Date(year, endMonth + 1, 0);

            conditions.push(
                and(
                    gte(facturas.fecha_emision, startDate),
                    lte(facturas.fecha_emision, endDate)
                )
            );
        }

        // We'll handle the provider filter differently because it's a join condition
        // But for SQLite/Drizzle simple where is fine if we join first.
        const results = await db
            .select({
                factura: facturas,
                contacto: contactos,
            })
            .from(facturas)
            .leftJoin(contactos, eq(facturas.contacto_id, contactos.id))
            .where(() => {
                const wheres = [...conditions];
                if (proveedor) {
                    wheres.push(or(
                        like(contactos.nombre_fiscal, `%${proveedor}%`),
                        like(contactos.nombre_comercial, `%${proveedor}%`)
                    ) as any);
                }
                return wheres.length > 0 ? and(...wheres) : undefined;
            })
            .orderBy(desc(facturas.fecha_emision))
            .limit(limit);



        // Transform results
        const invoices = results.map((row) => ({
            ...row.factura,
            contacto: row.contacto,
        }));

        return NextResponse.json(invoices);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        return NextResponse.json(
            { error: 'Failed to fetch invoices' },
            { status: 500 }
        );
    }
}

// POST /api/facturas - Create invoice
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.numero_factura || !body.fecha_emision || !body.total_factura) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Create invoice
        const [newInvoice] = await db.insert(facturas).values({
            tipo: body.tipo || 'recibida',
            contacto_id: body.contacto_id,
            numero_factura: body.numero_factura,
            fecha_emision: new Date(body.fecha_emision),
            estado: body.estado || 'pendiente_revision',
            base_imponible_total: body.base_imponible_total,
            iva_total: body.iva_total,
            total_factura: body.total_factura,
            url_archivo_pdf: body.url_archivo_pdf,
            json_ia_raw: body.json_ia_raw,
            nivel_confianza: body.nivel_confianza,
        }).returning();

        // Create VAT lines if provided
        if (body.lineas_iva && body.lineas_iva.length > 0) {
            await db.insert(lineas_iva).values(
                body.lineas_iva.map((linea: any) => ({
                    factura_id: newInvoice.id,
                    base_imponible: linea.base_imponible,
                    porcentaje_iva: linea.porcentaje_iva,
                    cuota_iva: linea.cuota_iva,
                }))
            );
        }

        return NextResponse.json(newInvoice, { status: 201 });
    } catch (error) {
        console.error('Error creating invoice:', error);
        return NextResponse.json(
            { error: 'Failed to create invoice' },
            { status: 500 }
        );
    }
}
// DELETE /api/facturas - Bulk delete
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.ids || !Array.isArray(body.ids)) {
            return NextResponse.json(
                { error: 'Invalid request body. Expected { ids: string[] }' },
                { status: 400 }
            );
        }

        // Delete line items first due to FK constraint (if cascade is not set, but Drizzle usually handles it if defined, let's differ)
        // With SQLite and Drizzle, best to delete lines then invoice or rely on CASCADE.
        // Let's delete lines explicitly to be safe.
        // Actually `inArray` is needed.
        const { inArray } = await import('drizzle-orm');

        // Drizzle doesn't support bulk delete across tables easily without cascade.
        // Assuming we rely on DB cascade or simple delete. 
        // Let's try deleting facturas directly, if it fails we fix.
        // Actually, I need to import `inArray` first.

        const ids = body.ids;

        // Delete related VAT lines
        await db.delete(lineas_iva).where(inArray(lineas_iva.factura_id, ids));

        // Delete invoices
        await db.delete(facturas).where(inArray(facturas.id, ids));

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error) {
        console.error('Error deleting invoices:', error);
        return NextResponse.json(
            { error: 'Failed to delete invoices' },
            { status: 500 }
        );
    }
}

// PATCH /api/facturas - Bulk update status
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.ids || !Array.isArray(body.ids) || !body.estado) {
            return NextResponse.json(
                { error: 'Invalid request body. Expected { ids: string[], estado: string }' },
                { status: 400 }
            );
        }

        const { inArray } = await import('drizzle-orm');
        const ids = body.ids;

        await db.update(facturas)
            .set({
                estado: body.estado,
                updated_at: new Date()
            })
            .where(inArray(facturas.id, ids));

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error) {
        console.error('Error updating invoices:', error);
        return NextResponse.json(
            { error: 'Failed to update invoices' },
            { status: 500 }
        );
    }
}
