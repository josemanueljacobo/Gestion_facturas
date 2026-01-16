import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { facturas } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
    try {
        // Count totals by status
        const [result] = await db
            .select({
                total: sql<number>`count(*)`,
                pendientes: sql<number>`sum(case when ${facturas.estado} = 'pendiente_revision' then 1 else 0 end)`,
                validadas: sql<number>`sum(case when ${facturas.estado} = 'validada' then 1 else 0 end)`,
                exportadas: sql<number>`sum(case when ${facturas.estado} = 'exportada' then 1 else 0 end)`,
            })
            .from(facturas);

        return NextResponse.json({
            total: Number(result.total) || 0,
            pendientes: Number(result.pendientes) || 0,
            validadas: Number(result.validadas) || 0,
            exportadas: Number(result.exportadas) || 0,
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
