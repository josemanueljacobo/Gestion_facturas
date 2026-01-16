'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';

interface Invoice {
    id: string;
    numero_factura: string;
    fecha_emision: string;
    estado: 'pendiente_revision' | 'validada' | 'exportada';
    total_factura: number;
    contacto?: {
        nombre_comercial: string;
        cif_nif: string;
    };
}

export default function RecentInvoices() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/facturas?limit=5')
            .then((res) => res.json())
            .then((data) => {
                setInvoices(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="card">Cargando...</div>;
    }

    if (invoices.length === 0) {
        return (
            <div className="card text-center" style={{ padding: '48px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    No hay facturas todavía
                </p>
                <Link href="/facturas" className="btn btn-primary">
                    Subir Primera Factura
                </Link>
            </div>
        );
    }

    return (
        <div className="table-container">
            <table className="table">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Proveedor/Cliente</th>
                        <th>Fecha</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {invoices.map((invoice) => (
                        <tr key={invoice.id}>
                            <td className="font-medium">{invoice.numero_factura}</td>
                            <td>
                                <div>{invoice.contacto?.nombre_comercial || '-'}</div>
                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {invoice.contacto?.cif_nif || '-'}
                                </div>
                            </td>
                            <td>{new Date(invoice.fecha_emision).toLocaleDateString('es-ES')}</td>
                            <td className="font-medium">€{invoice.total_factura.toFixed(2)}</td>
                            <td>
                                <StatusBadge estado={invoice.estado} />
                            </td>
                            <td className="text-right">
                                <Link href={`/facturas/${invoice.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                    Ver
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
