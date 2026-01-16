
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const facturasCount = await db.run(sql`SELECT count(*) as count FROM facturas`);
        const deptCount = await db.run(sql`SELECT count(*) as count FROM departamentos`);
        const contactCount = await db.run(sql`SELECT count(*) as count FROM contactos`);

        return NextResponse.json({
            facturas: facturasCount.rows[0],
            departamentos: deptCount.rows[0],
            contactos: contactCount.rows[0],
            lastInvoiceAI: (await db.run(sql`SELECT json_ia_raw FROM facturas ORDER BY created_at DESC LIMIT 1`)).rows[0]
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
