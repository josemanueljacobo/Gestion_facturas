import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { facturas, contactos, lineas_iva } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/facturas/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const [result] = await db
            .select({
                factura: facturas,
                contacto: contactos,
            })
            .from(facturas)
            .leftJoin(contactos, eq(facturas.contacto_id, contactos.id))
            .where(eq(facturas.id, params.id))
            .limit(1);

        if (!result) {
            return NextResponse.json(
                { error: 'Invoice not found' },
                { status: 404 }
            );
        }

        // Get VAT lines
        const vatLines = await db
            .select()
            .from(lineas_iva)
            .where(eq(lineas_iva.factura_id, params.id));

        return NextResponse.json({
            ...result.factura,
            contacto: result.contacto,
            lineas_iva: vatLines,
        });
    } catch (error) {
        console.error('Error fetching invoice:', error);
        return NextResponse.json(
            { error: 'Failed to fetch invoice' },
            { status: 500 }
        );
    }
}

// PUT /api/facturas/[id]
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();

        const [updated] = await db
            .update(facturas)
            .set({
                empresa_id: body.empresa_id || null,
                contacto_id: body.contacto_id,
                departamento_id: body.departamento_id || null, // Handle optional/empty
                numero_factura: body.numero_factura,
                fecha_emision: body.fecha_emision ? new Date(body.fecha_emision) : undefined,
                estado: body.estado,
                base_imponible_total: body.base_imponible_total,
                iva_total: body.iva_total,
                total_factura: body.total_factura,

                // New fields
                recargo_equivalencia: body.recargo_equivalencia,
                porcentaje_retencion: body.porcentaje_retencion,
                importe_retencion: body.importe_retencion,

                // New Accounting Fields
                bien_inversion: body.bien_inversion,
                tipo_retencion: body.tipo_retencion,
                clave_operacion: body.clave_operacion,
                fecha_operacion: body.fecha_operacion ? new Date(body.fecha_operacion) : undefined,

                updated_at: new Date(),
            })
            .where(eq(facturas.id, params.id))
            .returning();

        if (!updated) {
            return NextResponse.json(
                { error: 'Invoice not found' },
                { status: 404 }
            );
        }

        // Update VAT lines if provided
        if (body.lineas_iva) {
            // Delete existing lines
            await db.delete(lineas_iva).where(eq(lineas_iva.factura_id, params.id));

            // Insert new lines
            if (body.lineas_iva.length > 0) {
                await db.insert(lineas_iva).values(
                    body.lineas_iva.map((linea: any) => ({
                        factura_id: params.id,
                        base_imponible: linea.base_imponible,
                        porcentaje_iva: linea.porcentaje_iva,
                        cuota_iva: linea.cuota_iva,
                        porcentaje_recargo: linea.porcentaje_recargo || 0,
                        cuota_recargo: linea.cuota_recargo || 0,
                    }))
                );
            }
        }

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Error updating invoice:', error);
        // Log detailed error info if available
        if (error.code) console.error('Error code:', error.code);
        if (error.meta) console.error('Error meta:', error.meta);
        if (error.message) console.error('Error message:', error.message);

        return NextResponse.json(
            { error: 'Failed to update invoice', details: error.message },
            { status: 500 }
        );
    }
}

// DELETE /api/facturas/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await db.delete(facturas).where(eq(facturas.id, params.id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting invoice:', error);
        return NextResponse.json(
            { error: 'Failed to delete invoice' },
            { status: 500 }
        );
    }
}
