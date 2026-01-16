import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contactos } from '@/lib/db/schema';
import { eq, or, like } from 'drizzle-orm';

// GET /api/contactos - List all contacts
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const tipo = searchParams.get('tipo');
        const search = searchParams.get('search');

        // Apply filters
        const conditions = [];
        if (tipo && (tipo === 'proveedor' || tipo === 'cliente')) {
            conditions.push(eq(contactos.tipo, tipo));
        }
        if (search) {
            conditions.push(
                or(
                    like(contactos.cif_nif, `%${search}%`),
                    like(contactos.nombre_fiscal, `%${search}%`),
                    like(contactos.nombre_comercial, `%${search}%`)
                )
            );
        }

        const whereClause = conditions.length > 0
            ? (conditions.length === 1 ? conditions[0] : and(...conditions))
            : undefined;

        const results = await db.select().from(contactos).where(whereClause);
        return NextResponse.json(results);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch contacts' },
            { status: 500 }
        );
    }
}

// POST /api/contactos - Create new contact
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.tipo || !body.cif_nif || !body.nombre_fiscal) {
            return NextResponse.json(
                { error: 'Missing required fields: tipo, cif_nif, nombre_fiscal' },
                { status: 400 }
            );
        }

        // Check if CIF already exists
        const existing = await db
            .select()
            .from(contactos)
            .where(eq(contactos.cif_nif, body.cif_nif))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json(
                { error: 'CIF/NIF already exists' },
                { status: 409 }
            );
        }

        const [newContact] = await db.insert(contactos).values({
            tipo: body.tipo,
            cif_nif: body.cif_nif,
            nombre_fiscal: body.nombre_fiscal,
            nombre_comercial: body.nombre_comercial,
            codigo_contable: body.codigo_contable,
            email: body.email,
            direccion: body.direccion,
            pais_iso: body.pais_iso || 'ES',
        }).returning();

        return NextResponse.json(newContact, { status: 201 });
    } catch (error) {
        console.error('Error creating contact:', error);
        return NextResponse.json(
            { error: 'Failed to create contact' },
            { status: 500 }
        );
    }
}
