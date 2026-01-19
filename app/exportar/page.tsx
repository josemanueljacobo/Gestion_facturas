'use client';

import { useState } from 'react';

export default function ExportarPage() {
    const [trimestre, setTrimestre] = useState('T1');
    const [ano, setAno] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/exportar/factusol', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trimestre, ano }),
            });

            if (!res.ok) throw new Error('Error generating export');

            // Download Excel file
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `FRE.xls`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            alert('Exportación completada exitosamente');
        } catch (error) {
            alert('Error al generar la exportación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '32px' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
                    Exportar a Factusol
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Genera archivo Excel (FRE.xls) para importar en Factusol
                </p>
            </div>

            <div className="card" style={{ maxWidth: '600px' }}>
                <div className="card-header">Configuración de Exportación</div>

                <div className="form-group">
                    <label className="form-label">Trimestre</label>
                    <select
                        className="form-select"
                        value={trimestre}
                        onChange={(e) => setTrimestre(e.target.value)}
                    >
                        <option value="T1">T1 (Enero - Marzo)</option>
                        <option value="T2">T2 (Abril - Junio)</option>
                        <option value="T3">T3 (Julio - Septiembre)</option>
                        <option value="T4">T4 (Octubre - Diciembre)</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Año</label>
                    <select
                        className="form-select"
                        value={ano}
                        onChange={(e) => setAno(parseInt(e.target.value))}
                    >
                        {[2024, 2025, 2026, 2027].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                <div className="alert" style={{
                    padding: '12px',
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '16px'
                }}>
                    <div style={{ fontSize: '13px', color: '#92400E' }}>
                        ⚠️ Se exportarán todas las facturas <strong>validadas</strong> del periodo seleccionado y se marcarán como <strong>exportadas</strong>.
                    </div>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleExport}
                    disabled={loading}
                    style={{ width: '100%' }}
                >
                    {loading ? 'Generando exportación...' : '📤 Generar y Descargar Excel'}
                </button>
            </div>

            {/* Information Card */}
            <div className="card" style={{ maxWidth: '600px', marginTop: '24px' }}>
                <div className="card-header">Formato de Exportación</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <p style={{ marginBottom: '12px' }}>
                        El archivo Excel (FRE.xls) sigue el formato oficial de Factusol para facturas recibidas con:
                    </p>
                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                        <li>76 columnas (A-CT) según especificación Factusol</li>
                        <li>Datos del proveedor (NIF, nombre, dirección)</li>
                        <li>Información de la factura (número, fecha, importes)</li>
                        <li>Desglose de IVA (hasta 3 tipos impositivos)</li>
                        <li>Campos adicionales de contabilidad y gestión</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
