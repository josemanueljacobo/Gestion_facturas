import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { empresas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/empresas/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const [result] = await db
            .select()
            .from(empresas)
            .where(eq(empresas.id, params.id))
            .limit(1);

        if (!result) {
            return NextResponse.json(
                { error: 'Company not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching company:', error);
        return NextResponse.json(
            { error: 'Failed to fetch company' },
            { status: 500 }
        );
    }
}

// PUT /api/empresas/[id]
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();

        const [updated] = await db
            .update(empresas)
            .set({
                cif_nif: body.cif_nif,
                nombre_fiscal: body.nombre_fiscal,
                nombre_comercial: body.nombre_comercial || null,
                direccion: body.direccion || null,
                email: body.email || null,
                telefono: body.telefono || null,
            })
            .where(eq(empresas.id, params.id))
            .returning();

        if (!updated) {
            return NextResponse.json(
                { error: 'Company not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating company:', error);
        return NextResponse.json(
            { error: 'Failed to update company' },
            { status: 500 }
        );
    }
}

// DELETE /api/empresas/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await db.delete(empresas).where(eq(empresas.id, params.id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting company:', error);
        return NextResponse.json(
            { error: 'Failed to delete company' },
            { status: 500 }
        );
    }
}
