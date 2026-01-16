import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { facturas, empresas, contactos } from '@/lib/db/schema';
import { sql, eq, count, sum } from 'drizzle-orm';

// GET /api/dashboard/stats
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const empresaId = searchParams.get('empresa_id');

        // Base condition for empresa filter
        const empresaCondition = empresaId ? eq(facturas.empresa_id, empresaId) : undefined;

        // Total counts by status
        const statusCounts = await db
            .select({
                estado: facturas.estado,
                count: count(),
                total: sum(facturas.total_factura),
            })
            .from(facturas)
            .where(empresaCondition)
            .groupBy(facturas.estado);

        // Get counts for all empresas
        const empresaStats = await db
            .select({
                empresa_id: facturas.empresa_id,
                count: count(),
                total: sum(facturas.total_factura),
            })
            .from(facturas)
            .groupBy(facturas.empresa_id);

        // Get empresa names
        const allEmpresas = await db.select().from(empresas);

        // Merge empresa names with stats
        const empresaStatsWithNames = empresaStats.map(stat => {
            const empresa = allEmpresas.find(e => e.id === stat.empresa_id);
            return {
                ...stat,
                nombre: empresa?.nombre_comercial || empresa?.nombre_fiscal || 'Sin empresa',
                cif: empresa?.cif_nif || '-'
            };
        });

        // Monthly totals for current year
        const currentYear = new Date().getFullYear();
        const monthlyData = await db
            .select({
                month: sql<number>`strftime('%m', datetime(${facturas.fecha_emision} / 1000, 'unixepoch'))`,
                count: count(),
                total: sum(facturas.total_factura),
            })
            .from(facturas)
            .where(
                empresaCondition
                    ? sql`strftime('%Y', datetime(${facturas.fecha_emision} / 1000, 'unixepoch')) = ${String(currentYear)} AND ${facturas.empresa_id} = ${empresaId}`
                    : sql`strftime('%Y', datetime(${facturas.fecha_emision} / 1000, 'unixepoch')) = ${String(currentYear)}`
            )
            .groupBy(sql`strftime('%m', datetime(${facturas.fecha_emision} / 1000, 'unixepoch'))`);

        // Recent activity (last 10 invoices)
        const recentInvoices = await db
            .select({
                id: facturas.id,
                numero_factura: facturas.numero_factura,
                total_factura: facturas.total_factura,
                estado: facturas.estado,
                fecha_emision: facturas.fecha_emision,
            })
            .from(facturas)
            .where(empresaCondition)
            .orderBy(sql`${facturas.created_at} DESC`)
            .limit(10);

        // Calculate totals
        const totalStats = {
            pendiente_revision: statusCounts.find(s => s.estado === 'pendiente_revision') || { count: 0, total: 0 },
            validada: statusCounts.find(s => s.estado === 'validada') || { count: 0, total: 0 },
            exportada: statusCounts.find(s => s.estado === 'exportada') || { count: 0, total: 0 },
        };

        const totalFacturas = statusCounts.reduce((acc, s) => acc + Number(s.count), 0);
        const totalImporte = statusCounts.reduce((acc, s) => acc + Number(s.total || 0), 0);

        return NextResponse.json({
            totals: {
                facturas: totalFacturas,
                importe: totalImporte,
                pendientes: Number(totalStats.pendiente_revision.count),
                validadas: Number(totalStats.validada.count),
                exportadas: Number(totalStats.exportada.count),
                importePendiente: Number(totalStats.pendiente_revision.total || 0),
                importeValidado: Number(totalStats.validada.total || 0),
                importeExportado: Number(totalStats.exportada.total || 0),
            },
            empresaStats: empresaStatsWithNames,
            monthlyData: monthlyData.map(m => ({
                month: Number(m.month),
                count: Number(m.count),
                total: Number(m.total || 0),
            })),
            recentInvoices,
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        );
    }
}
