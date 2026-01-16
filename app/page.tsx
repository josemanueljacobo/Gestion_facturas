import Link from 'next/link';
import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentInvoices from '@/components/dashboard/RecentInvoices';

export default function HomePage() {
    return (
        <div style={{ padding: '32px' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
                    Dashboard
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Visión general del sistema de gestión de facturas
                </p>
            </div>

            <DashboardStats />

            <div style={{ marginTop: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Facturas Recientes</h2>
                    <Link href="/facturas" className="btn btn-secondary">
                        Ver todas
                    </Link>
                </div>
                <RecentInvoices />
            </div>
        </div>
    );
}
