'use client';

import { useState, useEffect } from 'react';
import FileUpload from '@/components/ui/FileUpload';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import { useEmpresa } from '@/lib/context/EmpresaContext';

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
    nivel_confianza?: number;
}

interface UploadingFile {
    file: File;
    status: 'uploading' | 'processing' | 'done' | 'error' | 'duplicate';
    extractedData?: any;
    message?: string;
}

export default function FacturasPage() {
    const { selectedEmpresa, selectedEmpresaId } = useEmpresa();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
    const [filter, setFilter] = useState<string>('all');
    const [trimestre, setTrimestre] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        fetchInvoices();
    }, [filter, trimestre, selectedEmpresaId]);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedIds.length === invoices.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(invoices.map(i => i.id));
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`¿Eliminar ${selectedIds.length} facturas?`)) return;
        try {
            const res = await fetch('/api/facturas', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            });
            if (res.ok) {
                setInvoices(prev => prev.filter(i => !selectedIds.includes(i.id)));
                setSelectedIds([]);
            } else {
                alert('Error al eliminar');
            }
        } catch (e) { console.error(e); alert('Error'); }
    };

    const handleBulkValidate = async () => {
        try {
            const res = await fetch('/api/facturas', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds, estado: 'validada' }),
            });
            if (res.ok) {
                fetchInvoices();
                setSelectedIds([]);
            } else {
                alert('Error al validar');
            }
        } catch (e) { console.error(e); alert('Error'); }
    };

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            let url = '/api/facturas?limit=100';
            if (filter !== 'all') {
                url += `&estado=${filter}`;
            }
            if (trimestre) {
                url += `&trimestre=${trimestre}`;
            }
            if (selectedEmpresaId) {
                url += `&empresa_id=${selectedEmpresaId}`;
            }

            const res = await fetch(url);
            const data = await res.json();
            setInvoices(data);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (files: File[]) => {
        const newUploads = files.map(file => ({
            file,
            status: 'uploading' as const,
        }));

        setUploadingFiles(prev => [...prev, ...newUploads]);

        // Process files sequentially to avoid overwhelming the server/browser
        for (const file of files) {
            try {
                // Upload file
                const formData = new FormData();
                formData.append('file', file);

                const res = await fetch('/api/facturas/upload', {
                    method: 'POST',
                    body: formData,
                });

                const data = await res.json();

                // Update status with invoice ID
                setUploadingFiles(prev => prev.map(item =>
                    item.file === file
                        ? { ...item, status: 'done', extractedData: data }
                        : item
                ));

                // Refresh invoices list to show new pending invoice
                fetchInvoices();

            } catch (error) {
                setUploadingFiles(prev => prev.map(item =>
                    item.file === file ? { ...item, status: 'error' } : item
                ));
            }
        }
    };


    const handleExport = async () => {
        try {
            const res = await fetch('/api/facturas/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceIds: [] }),
            });

            if (!res.ok) throw new Error('Export failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'FRE.xls';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert('Error al exportar');
        }
    };

    return (
        <div style={{ padding: '32px' }}>
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
                        Gestión de Facturas
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Sube, valida y gestiona tus facturas con IA
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    💾 Exportar Factusol
                </button>
            </div>

            {/* Upload Zone */}
            <div style={{ marginBottom: '32px' }}>
                <FileUpload onFileSelect={handleFileSelect} multiple={true} />
            </div>

            {/* Uploading Files */}
            {uploadingFiles.length > 0 && (
                <div className="card" style={{ marginBottom: '32px' }}>
                    <div className="card-header">Procesando archivos</div>
                    {uploadingFiles.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                borderBottom: index < uploadingFiles.length - 1 ? '1px solid var(--border-light)' : 'none',
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '500' }}>{item.file.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    {item.status === 'uploading' && 'Subiendo...'}
                                    {item.status === 'processing' && 'Extrayendo datos...'}
                                    {item.status === 'done' && 'Completado - Listo para validar'}
                                    {item.status === 'error' && 'Error al procesar'}
                                    {item.status === 'duplicate' && (
                                        <span style={{ color: '#B45309', fontWeight: 'bold' }}>
                                            ⚠️ Duplicada: {item.message}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {item.status === 'uploading' || item.status === 'processing' ? (
                                <div className="spinner" />
                            ) : item.status === 'done' ? (
                                <>
                                    <span style={{ fontSize: '20px', color: 'var(--color-success)' }}>✓</span>
                                    <Link
                                        href={`/facturas/validar?invoiceId=${item.extractedData?.invoiceId}`}
                                        className="btn btn-primary"
                                        style={{ fontSize: '13px', padding: '6px 16px' }}
                                    >
                                        Validar
                                    </Link>
                                </>
                            ) : item.status === 'duplicate' ? (
                                <>
                                    <span style={{ fontSize: '20px', color: '#F59E0B' }}>⚠️</span>
                                    <Link
                                        href={`/facturas/validar?invoiceId=${item.extractedData?.invoiceId}`}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '13px', padding: '6px 16px' }}
                                    >
                                        Ver Existente
                                    </Link>
                                </>
                            ) : (
                                <span style={{ fontSize: '20px', color: 'var(--color-danger)' }}>✗</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                        <label className="form-label">Estado</label>
                        <select
                            className="form-select"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            style={{ width: '200px' }}
                        >
                            <option value="all">Todos</option>
                            <option value="pendiente_revision">Pendiente Revisión</option>
                            <option value="validada">Validada</option>
                            <option value="exportada">Exportada</option>
                        </select>
                    </div>

                    <div>
                        <label className="form-label">Trimestre</label>
                        <select
                            className="form-select"
                            value={trimestre}
                            onChange={(e) => setTrimestre(e.target.value)}
                            style={{ width: '150px' }}
                        >
                            <option value="">Todos</option>
                            <option value="T1">T1 (Ene-Mar)</option>
                            <option value="T2">T2 (Abr-Jun)</option>
                            <option value="T3">T3 (Jul-Sep)</option>
                            <option value="T4">T4 (Oct-Dic)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Invoices Table */}
            {loading ? (
                <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
                    Cargando...
                </div>
            ) : invoices.length === 0 ? (
                <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        No hay facturas que mostrar
                    </p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px', padding: '16px' }}>
                                    <input
                                        type="checkbox"
                                        checked={invoices.length > 0 && selectedIds.length === invoices.length}
                                        onChange={toggleAll}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                </th>
                                <th>Número</th>
                                <th>Proveedor/Cliente</th>
                                <th>Fecha</th>
                                <th>Total</th>
                                <th>Confianza IA</th>
                                <th>Estado</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((invoice) => (
                                <tr key={invoice.id} style={{ backgroundColor: selectedIds.includes(invoice.id) ? 'var(--highlight-bg)' : 'transparent' }}>
                                    <td style={{ padding: '16px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(invoice.id)}
                                            onChange={() => toggleSelection(invoice.id)}
                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                    </td>
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
                                        {invoice.nivel_confianza !== undefined && (
                                            <div title={`Confianza: ${(invoice.nivel_confianza * 100).toFixed(0)}%`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '6px',
                                                    backgroundColor: '#e5e7eb',
                                                    borderRadius: '4px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${Math.min(100, Math.max(0, invoice.nivel_confianza * 100))}%`,
                                                        height: '100%',
                                                        backgroundColor: invoice.nivel_confianza > 0.8 ? '#10b981' : invoice.nivel_confianza > 0.5 ? '#f59e0b' : '#ef4444'
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    {(invoice.nivel_confianza * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <StatusBadge estado={invoice.estado} />
                                    </td>
                                    <td className="text-right">
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={async () => {
                                                    if (confirm('¿Estás seguro de que quieres eliminar esta factura?')) {
                                                        try {
                                                            const res = await fetch(`/api/facturas/${invoice.id}`, {
                                                                method: 'DELETE',
                                                            });
                                                            if (res.ok) {
                                                                setInvoices(invoices.filter(i => i.id !== invoice.id));
                                                            } else {
                                                                alert('Error al eliminar la factura');
                                                            }
                                                        } catch (error) {
                                                            console.error('Error deleting invoice:', error);
                                                            alert('Error al eliminar la factura');
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '13px',
                                                    backgroundColor: '#FEE2E2',
                                                    color: '#991B1B',
                                                    border: '1px solid #FECACA'
                                                }}
                                            >
                                                🗑️
                                            </button>
                                            <Link
                                                href={`/facturas/validar?invoiceId=${invoice.id}`}
                                                className="btn btn-secondary"
                                                style={{ padding: '6px 12px', fontSize: '13px' }}
                                            >
                                                {invoice.estado === 'pendiente_revision' ? 'Validar' : 'Editar'}
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: '32px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'white',
                    padding: '12px 24px',
                    borderRadius: '50px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    zIndex: 100,
                    border: '1px solid var(--border-light)'
                }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {selectedIds.length} seleccionadas
                    </span>
                    <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-light)' }} />
                    <button
                        onClick={handleBulkValidate}
                        className="btn btn-primary"
                        style={{ borderRadius: '20px', padding: '8px 20px' }}
                    >
                        ✅ Validar
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        className="btn"
                        style={{
                            borderRadius: '20px',
                            padding: '8px 20px',
                            backgroundColor: '#fee2e2',
                            color: '#ef4444',
                            border: 'none'
                        }}
                    >
                        🗑️ Eliminar
                    </button>
                    <button
                        onClick={() => setSelectedIds([])}
                        style={{
                            marginLeft: '8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%'
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}
