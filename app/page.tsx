'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useEmpresa } from '@/lib/context/EmpresaContext';

interface DashboardStats {
    totals: {
        facturas: number;
        importe: number;
        pendientes: number;
        validadas: number;
        exportadas: number;
        importePendiente: number;
        importeValidado: number;
        importeExportado: number;
    };
    empresaStats: Array<{
        empresa_id: string;
        nombre: string;
        cif: string;
        count: number;
        total: number;
    }>;
    monthlyData: Array<{
        month: number;
        count: number;
        total: number;
    }>;
    recentInvoices: Array<{
        id: string;
        numero_factura: string;
        total_factura: number;
        estado: string;
        fecha_emision: string;
    }>;
}

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function DashboardPage() {
    const { selectedEmpresa, selectedEmpresaId } = useEmpresa();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [selectedEmpresaId]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            let url = '/api/dashboard/stats';
            if (selectedEmpresaId) {
                url += `?empresa_id=${selectedEmpresaId}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    if (loading) {
        return (
            <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div>Cargando estadísticas...</div>
            </div>
        );
    }

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                    📊 Dashboard
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {selectedEmpresa
                        ? `Estadísticas de ${selectedEmpresa.nombre_comercial || selectedEmpresa.nombre_fiscal}`
                        : 'Visión general de todas las empresas'
                    }
                </p>
            </div>

            {/* Main Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
            }}>
                {/* Total Facturas */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    color: 'white'
                }}>
                    <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Facturas</div>
                    <div style={{ fontSize: '36px', fontWeight: '700' }}>{stats?.totals.facturas || 0}</div>
                    <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '8px' }}>
                        {formatCurrency(stats?.totals.importe || 0)}
                    </div>
                </div>

                {/* Pendientes */}
                <div style={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    color: 'white'
                }}>
                    <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Pendientes</div>
                    <div style={{ fontSize: '36px', fontWeight: '700' }}>{stats?.totals.pendientes || 0}</div>
                    <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '8px' }}>
                        {formatCurrency(stats?.totals.importePendiente || 0)}
                    </div>
                </div>

                {/* Validadas */}
                <div style={{
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    color: 'white'
                }}>
                    <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Validadas</div>
                    <div style={{ fontSize: '36px', fontWeight: '700' }}>{stats?.totals.validadas || 0}</div>
                    <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '8px' }}>
                        {formatCurrency(stats?.totals.importeValidado || 0)}
                    </div>
                </div>

                {/* Exportadas */}
                <div style={{
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    color: 'white'
                }}>
                    <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Exportadas</div>
                    <div style={{ fontSize: '36px', fontWeight: '700' }}>{stats?.totals.exportadas || 0}</div>
                    <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '8px' }}>
                        {formatCurrency(stats?.totals.importeExportado || 0)}
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Monthly Chart */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>
                        📅 Facturas por Mes ({new Date().getFullYear()})
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '8px' }}>
                        {monthNames.map((month, index) => {
                            const monthData = stats?.monthlyData.find(m => m.month === index + 1);
                            const count = monthData?.count || 0;
                            const maxCount = Math.max(...(stats?.monthlyData.map(m => m.count) || [1]), 1);
                            const height = count > 0 ? Math.max((count / maxCount) * 160, 8) : 4;

                            return (
                                <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                        {count > 0 ? count : ''}
                                    </div>
                                    <div
                                        style={{
                                            width: '100%',
                                            height: `${height}px`,
                                            backgroundColor: count > 0 ? '#667eea' : '#e5e7eb',
                                            borderRadius: '4px 4px 0 0',
                                            transition: 'height 0.3s ease'
                                        }}
                                    />
                                    <div style={{ fontSize: '11px', marginTop: '8px', color: 'var(--text-secondary)' }}>
                                        {month}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* By Company */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>
                        🏛️ Facturas por Empresa
                    </h3>
                    {stats?.empresaStats && stats.empresaStats.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {stats.empresaStats.slice(0, 5).map((empresa, index) => {
                                const maxTotal = Math.max(...stats.empresaStats.map(e => Number(e.total) || 0), 1);
                                const width = ((Number(empresa.total) || 0) / maxTotal) * 100;

                                return (
                                    <div key={empresa.empresa_id || index}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '500' }}>
                                                {empresa.nombre}
                                            </span>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                {empresa.count} · {formatCurrency(Number(empresa.total) || 0)}
                                            </span>
                                        </div>
                                        <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}>
                                            <div
                                                style={{
                                                    height: '100%',
                                                    width: `${width}%`,
                                                    backgroundColor: ['#667eea', '#4facfe', '#43e97b', '#f5576c', '#ffa726'][index % 5],
                                                    borderRadius: '4px',
                                                    transition: 'width 0.3s ease'
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>
                            No hay datos de empresas
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Invoices */}
            <div style={{
                marginTop: '24px',
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                        📄 Últimas Facturas
                    </h3>
                    <Link href="/facturas" style={{ color: 'var(--primary)', fontSize: '14px', textDecoration: 'none' }}>
                        Ver todas →
                    </Link>
                </div>

                {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Nº Factura</th>
                                <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Fecha</th>
                                <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Importe</th>
                                <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentInvoices.map((invoice) => (
                                <tr key={invoice.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                                        <Link href={`/facturas/validar?invoiceId=${invoice.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                            {invoice.numero_factura}
                                        </Link>
                                    </td>
                                    <td style={{ padding: '12px 8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                        {invoice.fecha_emision ? new Date(invoice.fecha_emision).toLocaleDateString('es-ES') : '-'}
                                    </td>
                                    <td style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'right', fontWeight: '500' }}>
                                        {formatCurrency(invoice.total_factura)}
                                    </td>
                                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            backgroundColor: invoice.estado === 'validada' ? '#DCFCE7' : invoice.estado === 'exportada' ? '#DBEAFE' : '#FEF3C7',
                                            color: invoice.estado === 'validada' ? '#166534' : invoice.estado === 'exportada' ? '#1E40AF' : '#92400E'
                                        }}>
                                            {invoice.estado === 'validada' ? 'Validada' : invoice.estado === 'exportada' ? 'Exportada' : 'Pendiente'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>
                        No hay facturas recientes
                    </div>
                )}
            </div>
        </div>
    );
}
