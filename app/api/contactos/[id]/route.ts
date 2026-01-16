import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contactos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/contactos/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const [contact] = await db
            .select()
            .from(contactos)
            .where(eq(contactos.id, params.id))
            .limit(1);

        if (!contact) {
            return NextResponse.json(
                { error: 'Contact not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(contact);
    } catch (error) {
        console.error('Error fetching contact:', error);
        return NextResponse.json(
            { error: 'Failed to fetch contact' },
            { status: 500 }
        );
    }
}

// PUT /api/contactos/[id]
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();

        const [updated] = await db
            .update(contactos)
            .set({
                tipo: body.tipo,
                nombre_fiscal: body.nombre_fiscal,
                nombre_comercial: body.nombre_comercial,
                codigo_contable: body.codigo_contable,
                email: body.email,
                direccion: body.direccion,
                pais_iso: body.pais_iso,
            })
            .where(eq(contactos.id, params.id))
            .returning();

        if (!updated) {
            return NextResponse.json(
                { error: 'Contact not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating contact:', error);
        return NextResponse.json(
            { error: 'Failed to update contact' },
            { status: 500 }
        );
    }
}

// DELETE /api/contactos/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await db
            .delete(contactos)
            .where(eq(contactos.id, params.id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting contact:', error);
        return NextResponse.json(
            { error: 'Failed to delete contact' },
            { status: 500 }
        );
    }
}
