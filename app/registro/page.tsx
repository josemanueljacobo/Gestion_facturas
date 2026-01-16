'use client';

import { useState, useEffect } from 'react';

interface Factura {
    id: number;
    numero_factura: string;
    fecha_emision: string;
    nombre_fiscal: string; // From contacts join or derived
    base_imponible_total: number;
    iva_total: number;
    importe_retencion: number;
    total_factura: number;
    estado: string;
    recargo_equivalencia: boolean;
    bien_inversion: boolean;
    url_archivo_pdf: string;
}

export default function RegistroPage() {
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [filteredFacturas, setFilteredFacturas] = useState<Factura[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [contactFilter, setContactFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');

    useEffect(() => {
        fetchFacturas();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [facturas, dateStart, dateEnd, contactFilter, statusFilter]);

    const fetchFacturas = async () => {
        setIsLoading(true);
        try {
            // Fetch all invoices - in a real app might paginate or filter server-side
            const res = await fetch('/api/facturas?limit=1000');
            if (res.ok) {
                const data = await res.json();
                // Filter client side for now to include only validated/exported
                const registryData = data.filter((f: any) =>
                    f.estado === 'validada' || f.estado === 'exportada'
                ).map((f: any) => ({
                    ...f,
                    nombre_fiscal: f.contacto?.nombre_fiscal || 'Proveedor Desconocido'
                }));
                setFacturas(registryData);
            }
        } catch (error) {
            console.error('Error fetching registry:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...facturas];

        if (dateStart) {
            result = result.filter(f => new Date(f.fecha_emision) >= new Date(dateStart));
        }
        if (dateEnd) {
            result = result.filter(f => new Date(f.fecha_emision) <= new Date(dateEnd));
        }
        if (contactFilter) {
            result = result.filter(f =>
                f.nombre_fiscal.toLowerCase().includes(contactFilter.toLowerCase()) ||
                f.numero_factura.toLowerCase().includes(contactFilter.toLowerCase())
            );
        }
        if (statusFilter !== 'todos') {
            result = result.filter(f => f.estado === statusFilter);
        }

        setFilteredFacturas(result);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES');
    };

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    Registro de Facturas
                </h1>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {filteredFacturas.length} registros encontrados
                </div>
            </div>

            {/* Filter Bar */}
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '24px',
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                alignItems: 'end',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Desde</label>
                    <input
                        type="date"
                        value={dateStart}
                        onChange={(e) => setDateStart(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Hasta</label>
                    <input
                        type="date"
                        value={dateEnd}
                        onChange={(e) => setDateEnd(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Buscar (Proveedor / Nº Factura)</label>
                    <input
                        type="text"
                        placeholder="Escribe para buscar..."
                        value={contactFilter}
                        onChange={(e) => setContactFilter(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', width: '100%' }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Estado</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    >
                        <option value="todos">Todos</option>
                        <option value="validada">Validada</option>
                        <option value="exportada">Exportada</option>
                    </select>
                </div>

                <button
                    onClick={() => { setDateStart(''); setDateEnd(''); setContactFilter(''); setStatusFilter('todos'); }}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', height: '35px' }}
                >
                    Limpiar
                </button>
            </div>

            {/* Data Table */}
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Estado</th>
                            <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)', width: '60px' }}>Archivo</th>
                            <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Fecha</th>
                            <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Nº Factura</th>
                            <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Proveedor</th>
                            <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)' }}>Base Imp.</th>
                            <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)' }}>IVA</th>
                            <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)' }}>Retención</th>
                            <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)' }}>Flags</th>
                            <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando registros...</td>
                            </tr>
                        ) : filteredFacturas.length === 0 ? (
                            <tr>
                                <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No se encontraron facturas.</td>
                            </tr>
                        ) : (
                            filteredFacturas.map((factura, index) => (
                                <tr key={factura.id} style={{
                                    borderBottom: index < filteredFacturas.length - 1 ? '1px solid var(--border-color)' : 'none',
                                    backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)'
                                }}>
                                    <td style={{ padding: '16px' }}>
                                        {factura.estado === 'exportada' ? (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>
                                                <span>✓</span> Exportada
                                            </span>
                                        ) : (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>
                                                <span>✓</span> Validada
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        {factura.url_archivo_pdf ? (
                                            <a
                                                href={factura.url_archivo_pdf}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Ver PDF Original"
                                                style={{ fontSize: '18px', textDecoration: 'none', cursor: 'pointer' }}
                                            >
                                                📄
                                            </a>
                                        ) : (
                                            <span style={{ color: 'var(--text-disabled)', fontSize: '18px' }}>-</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', color: 'var(--text-primary)' }}>{formatDate(factura.fecha_emision)}</td>
                                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{factura.numero_factura}</td>
                                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: '500' }}>{factura.nombre_fiscal}</td>
                                    <td style={{ padding: '16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatCurrency(factura.base_imponible_total)}</td>
                                    <td style={{ padding: '16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatCurrency(factura.iva_total)}</td>
                                    <td style={{ padding: '16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                        {factura.importe_retencion > 0 ? (
                                            <span style={{ color: '#ef4444' }}>-{formatCurrency(factura.importe_retencion)}</span>
                                        ) : '-'}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                            {factura.recargo_equivalencia && (
                                                <span title="Recargo Equivalencia" style={{ cursor: 'help', fontSize: '12px', backgroundColor: '#f59e0b', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>RE</span>
                                            )}
                                            {factura.bien_inversion && (
                                                <span title="Bien de Inversión" style={{ cursor: 'help', fontSize: '12px', backgroundColor: '#8b5cf6', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>BI</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold', color: 'var(--text-primary)' }}>{formatCurrency(factura.total_factura)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
