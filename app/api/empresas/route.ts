import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { empresas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/empresas - List all companies
export async function GET() {
    try {
        const result = await db.select().from(empresas).orderBy(empresas.nombre_fiscal);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching companies:', error);
        return NextResponse.json(
            { error: 'Failed to fetch companies' },
            { status: 500 }
        );
    }
}

// POST /api/empresas - Create a new company
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.cif_nif || !body.nombre_fiscal) {
            return NextResponse.json(
                { error: 'CIF/NIF y Nombre Fiscal son obligatorios' },
                { status: 400 }
            );
        }

        // Check for duplicate CIF
        const existing = await db
            .select()
            .from(empresas)
            .where(eq(empresas.cif_nif, body.cif_nif))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json(
                { error: 'Ya existe una empresa con ese CIF/NIF' },
                { status: 400 }
            );
        }

        const [created] = await db
            .insert(empresas)
            .values({
                cif_nif: body.cif_nif,
                nombre_fiscal: body.nombre_fiscal,
                nombre_comercial: body.nombre_comercial || null,
                direccion: body.direccion || null,
                email: body.email || null,
                telefono: body.telefono || null,
            })
            .returning();

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('Error creating company:', error);
        return NextResponse.json(
            { error: 'Failed to create company' },
            { status: 500 }
        );
    }
}
