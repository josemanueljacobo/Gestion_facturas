import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { departamentos } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const result = await db.select().from(departamentos).orderBy(desc(departamentos.created_at));
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching departments:', error);
        return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.nombre || !body.codigo) {
            return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 });
        }

        const [newDept] = await db.insert(departamentos).values({
            nombre: body.nombre,
            codigo: parseInt(body.codigo),
        }).returning();

        return NextResponse.json(newDept, { status: 201 });
    } catch (error) {
        console.error('Error creating department:', error);
        return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await db.delete(departamentos).where(eq(departamentos.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting department:', error);
        return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
    }
}
