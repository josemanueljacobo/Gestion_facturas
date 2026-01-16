'use client';

import { useEffect, useState } from 'react';

interface Stats {
    total: number;
    pendientes: number;
    validadas: number;
    exportadas: number;
}

export default function DashboardStats() {
    const [stats, setStats] = useState<Stats>({
        total: 0,
        pendientes: 0,
        validadas: 0,
        exportadas: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard/stats')
            .then((res) => res.json())
            .then((data) => {
                setStats(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const statCards = [
        {
            label: 'Total Facturas',
            value: stats.total,
            icon: '📊',
            color: '#3B82F6',
        },
        {
            label: 'Pendientes Revisión',
            value: stats.pendientes,
            icon: '⏳',
            color: '#FBBF24',
        },
        {
            label: 'Validadas',
            value: stats.validadas,
            icon: '✓',
            color: '#3B82F6',
        },
        {
            label: 'Exportadas',
            value: stats.exportadas,
            icon: '📤',
            color: '#10B981',
        },
    ];

    if (loading) {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="card" style={{ height: '120px' }} />
                ))}
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {statCards.map((stat) => (
                <div
                    key={stat.label}
                    className="card"
                    style={{
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                {stat.label}
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '700', color: stat.color }}>
                                {stat.value}
                            </div>
                        </div>
                        <div style={{ fontSize: '36px', opacity: 0.2 }}>
                            {stat.icon}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
