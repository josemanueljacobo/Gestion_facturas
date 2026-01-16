'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { useEmpresa } from '@/lib/context/EmpresaContext';

function ValidarFacturaContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { selectedEmpresa, selectedEmpresaId } = useEmpresa();
    const [loading, setLoading] = useState(false);
    const [contacts, setContacts] = useState<any[]>([]);
    const [departamentos, setDepartamentos] = useState<any[]>([]);
    const [formData, setFormData] = useState<any>({
        tipo: 'recibida',
        empresa_id: '',
        contacto_id: '',
        departamento_id: '',
        numero_factura: '',
        fecha_emision: '',
        base_imponible_total: 0,
        iva_total: 0,
        total_factura: 0,
        estado: 'validada',
        lineas_iva: [],
        recargo_equivalencia: false,
        porcentaje_retencion: 0,
        importe_retencion: 0,

        // Accounting fields
        bien_inversion: false,
        tipo_retencion: 0,
        clave_operacion: 0,
        fecha_operacion: '',
    });

    useEffect(() => {
        const loadData = async () => {
            // Get invoice ID from URL params
            const invoiceId = searchParams.get('invoiceId');
            if (!invoiceId) {
                console.error('No invoice ID provided');
                return;
            }

            try {
                // Load invoice from API
                const invoiceRes = await fetch(`/api/facturas/${invoiceId}`);
                if (!invoiceRes.ok) {
                    throw new Error('Failed to load invoice');
                }
                const invoice = await invoiceRes.json();

                console.log('Loaded invoice data:', invoice);

                // Convert timestamp to date string for input[type="date"]
                let fechaEmisionStr = '';
                if (invoice.fecha_emision) {
                    try {
                        const date = new Date(invoice.fecha_emision);
                        if (!isNaN(date.getTime())) {
                            fechaEmisionStr = date.toISOString().split('T')[0];
                        }
                    } catch (e) {
                        console.error('Error converting date:', e);
                    }
                }

                // Populate form with invoice data
                setFormData({
                    tipo: invoice.tipo || 'recibida',
                    empresa_id: invoice.empresa_id || '',
                    contacto_id: invoice.contacto_id || '',
                    departamento_id: invoice.departamento_id || '',
                    numero_factura: invoice.numero_factura || '',
                    fecha_emision: fechaEmisionStr,
                    base_imponible_total: invoice.base_imponible_total || 0,
                    iva_total: invoice.iva_total || 0,
                    total_factura: invoice.total_factura || 0,
                    estado: 'validada', // Change status to validated when saving
                    url_archivo_pdf: invoice.url_archivo_pdf,
                    json_ia_raw: invoice.json_ia_raw,
                    nivel_confianza: invoice.nivel_confianza,
                    lineas_iva: invoice.lineas_iva || [],
                    recargo_equivalencia: invoice.recargo_equivalencia || false,
                    porcentaje_retencion: invoice.porcentaje_retencion || 0,
                    importe_retencion: invoice.importe_retencion || 0,

                    bien_inversion: invoice.bien_inversion || false,
                    tipo_retencion: invoice.tipo_retencion || 0,
                    clave_operacion: invoice.clave_operacion || 0,
                    fecha_operacion: invoice.fecha_operacion ? new Date(invoice.fecha_operacion).toISOString().split('T')[0] : '',

                    invoiceId: invoiceId, // Store for update
                });

                console.log('Form data set successfully');
            } catch (error) {
                console.error('Error loading invoice:', error);
                alert('❌ Error al cargar la factura');
            }
        };

        // Fetch contacts for dropdown
        fetch('/api/contactos')
            .then(res => res.json())
            .then(data => setContacts(data))
            .catch(console.error);

        // Fetch departments
        fetch('/api/departamentos')
            .then(res => res.json())
            .then(data => setDepartamentos(data))
            .catch(console.error);

        loadData();
    }, [searchParams]);

    // Auto-set empresa_id from global context when it changes
    useEffect(() => {
        if (selectedEmpresaId && !formData.empresa_id) {
            setFormData((prev: any) => ({ ...prev, empresa_id: selectedEmpresaId }));
        }
    }, [selectedEmpresaId]);

    // Filter contacts to exclude those with same CIF as selected empresa
    const availableContacts = contacts.filter(
        contact => !selectedEmpresa || contact.cif_nif !== selectedEmpresa.cif_nif
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.invoiceId) {
                throw new Error('No invoice ID available');
            }

            if (!selectedEmpresaId) {
                throw new Error('Debes seleccionar una empresa en el menú lateral');
            }

            // Validate retention type if invoice has retention
            const hasRetention = (formData.porcentaje_retencion > 0 || formData.importe_retencion > 0);
            if (hasRetention && (!formData.tipo_retencion || formData.tipo_retencion === 0)) {
                throw new Error('Debes seleccionar el tipo de retención para facturas con retención');
            }

            const res = await fetch(`/api/facturas/${formData.invoiceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, empresa_id: selectedEmpresaId }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.details || errData.error || 'Failed to update invoice');
            }

            alert('✅ Factura validada exitosamente');
            router.push('/facturas');
        } catch (error: any) {
            console.error(error);
            alert(`❌ Error al validar la factura: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const getConfidenceClass = (field: string) => {
        const confidence = (formData.json_ia_raw?.fieldConfidence || {})[field] || 1;
        return confidence < 0.7 ? 'form-input low-confidence' : 'form-input';
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-light)', backgroundColor: 'white' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                    {formData.estado === 'validada' ? 'Editar Factura' : 'Validar Factura'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {formData.estado === 'validada'
                        ? 'Modifica los datos de la factura ya validada'
                        : 'Revisa y corrige los datos extraídos por la IA'}
                </p>
            </div>

            {/* Split View */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Left Side - Form (40%) */}
                <div style={{
                    width: '40%',
                    overflowY: 'auto',
                    padding: '24px',
                    borderRight: '1px solid var(--border-light)',
                    backgroundColor: 'var(--bg-primary)'
                }}>
                    <form onSubmit={handleSubmit}>
                        {/* Empresa - Read-only from global context */}
                        <div className="form-group">
                            <label className="form-label">Empresa</label>
                            {selectedEmpresa ? (
                                <div style={{
                                    padding: '10px 12px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-light)',
                                    fontSize: '14px'
                                }}>
                                    <strong>{selectedEmpresa.nombre_comercial || selectedEmpresa.nombre_fiscal}</strong>
                                    <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>
                                        ({selectedEmpresa.cif_nif})
                                    </span>
                                </div>
                            ) : (
                                <div style={{
                                    padding: '12px',
                                    backgroundColor: '#FEF3C7',
                                    border: '1px solid #F59E0B',
                                    borderRadius: '6px',
                                    color: '#92400E'
                                }}>
                                    ⚠️ Selecciona una empresa en el menú lateral para continuar
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Proveedor/Cliente *</label>
                            <select
                                className="form-select"
                                value={formData.contacto_id}
                                onChange={(e) => setFormData({ ...formData, contacto_id: e.target.value })}
                                required
                                disabled={!selectedEmpresa}
                            >
                                <option value="">Seleccionar...</option>
                                {availableContacts.map((contact) => (
                                    <option key={contact.id} value={contact.id}>
                                        {contact.nombre_comercial || contact.nombre_fiscal} ({contact.cif_nif})
                                    </option>
                                ))}
                            </select>
                            {selectedEmpresa && availableContacts.length === 0 && contacts.length > 0 && (
                                <div className="form-hint" style={{ color: '#F59E0B' }}>
                                    ⚠️ Todos los contactos tienen el mismo CIF que la empresa
                                </div>
                            )}
                            {formData.json_ia_raw?.cif_nif && (
                                <div className="form-hint">
                                    CIF extraído: {formData.json_ia_raw.cif_nif}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Departamento</label>
                            <select
                                className="form-select"
                                value={formData.departamento_id}
                                onChange={(e) => setFormData({ ...formData, departamento_id: e.target.value })}
                            >
                                <option value="">Sin departamento</option>
                                {departamentos.map((dept) => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.nombre} ({dept.codigo})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Número de Factura</label>
                            <input
                                type="text"
                                className={getConfidenceClass('numero_factura')}
                                value={formData.numero_factura}
                                onChange={(e) => setFormData({ ...formData, numero_factura: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Fecha de Emisión</label>
                            <input
                                type="date"
                                className={getConfidenceClass('fecha_emision')}
                                value={formData.fecha_emision}
                                onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Base Imponible</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                value={formData.base_imponible_total}
                                onChange={(e) => setFormData({ ...formData, base_imponible_total: parseFloat(e.target.value) })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">IVA Total</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                value={formData.iva_total}
                                onChange={(e) => setFormData({ ...formData, iva_total: parseFloat(e.target.value) })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.recargo_equivalencia}
                                    onChange={(e) => setFormData({ ...formData, recargo_equivalencia: e.target.checked })}
                                    style={{ width: '16px', height: '16px' }}
                                />
                                Recargo de Equivalencia
                            </label>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Retención IRPF</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>% Retención</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        value={formData.porcentaje_retencion}
                                        onChange={(e) => {
                                            const pct = parseFloat(e.target.value) || 0;
                                            const importe = parseFloat((formData.base_imponible_total * (pct / 100)).toFixed(2));
                                            setFormData({
                                                ...formData,
                                                porcentaje_retencion: pct,
                                                importe_retencion: importe,
                                                total_factura: (formData.base_imponible_total + formData.iva_total - importe)
                                            });
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Importe</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        value={formData.importe_retencion}
                                        onChange={(e) => {
                                            const importe = parseFloat(e.target.value) || 0;
                                            setFormData({
                                                ...formData,
                                                importe_retencion: importe,
                                                total_factura: (formData.base_imponible_total + formData.iva_total - importe)
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Total Factura</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                value={formData.total_factura}
                                onChange={(e) => setFormData({ ...formData, total_factura: parseFloat(e.target.value) })}
                                required
                            />
                        </div>

                        {formData.nivel_confianza !== undefined && (
                            <div style={{
                                padding: '12px',
                                backgroundColor: formData.nivel_confianza > 0.7 ? '#D1FAE5' : '#FEF3C7',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: '16px'
                            }}>
                                <div style={{ fontSize: '13px' }}>
                                    <strong>Confianza IA:</strong> {(formData.nivel_confianza * 100).toFixed(0)}%
                                    {formData.nivel_confianza < 0.7 && (
                                        <div style={{ marginTop: '4px', color: '#92400E' }}>
                                            ⚠️ Revisa los campos en naranja
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Datos Factusol / Contables */}
                        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>Datos Contables (Factusol)</h3>

                            {/* Clave Operación (CN) */}
                            <div className="form-group">
                                <label className="form-label">Clave de Operación</label>
                                <select
                                    className="form-select"
                                    value={formData.clave_operacion}
                                    onChange={(e) => setFormData({ ...formData, clave_operacion: parseInt(e.target.value) })}
                                >
                                    <option value="0">0 - Operación habitual</option>
                                    <option value="1">1 - (A) Asiento resumen de facturas</option>
                                    <option value="2">2 - (B) Asiento resumen de tickets</option>
                                    <option value="3">3 - (C) Facturas con varios asientos</option>
                                    <option value="4">4 - (D) Factura rectificativa</option>
                                    <option value="5">5 - (E) Factura rectificativa (Importe pos.)</option>
                                </select>
                            </div>

                            {/* Tipo Retención (CM) */}
                            <div className="form-group">
                                <label className="form-label">Tipo de Retención</label>
                                <select
                                    className="form-select"
                                    value={formData.tipo_retencion}
                                    onChange={(e) => setFormData({ ...formData, tipo_retencion: parseInt(e.target.value) })}
                                >
                                    <option value="0">0 - Sin seleccionar</option>
                                    <option value="1">1 - Actividad profesional (dineraria)</option>
                                    <option value="2">2 - Actividad profesional (especie)</option>
                                    <option value="5">5 - Arrendamiento (dinerario)</option>
                                    <option value="6">6 - Arrendamiento (especie)</option>
                                    <option value="7">7 - Actividad empresarial</option>
                                </select>
                            </div>

                            {/* Bien Inversión (CK) */}
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.bien_inversion}
                                        onChange={(e) => setFormData({ ...formData, bien_inversion: e.target.checked })}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    Bien de Inversión
                                </label>
                            </div>

                            {/* Fecha Operación (CO) */}
                            <div className="form-group">
                                <label className="form-label">Fecha de Operación</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.fecha_operacion}
                                    onChange={(e) => setFormData({ ...formData, fecha_operacion: e.target.value })}
                                />
                                <div className="form-hint">Opcional. Si es diferente a fecha emisión.</div>
                            </div>
                        </div>

                        {/* Error de IA Display */}
                        {formData.json_ia_raw?.error && (
                            <div style={{
                                padding: '12px',
                                backgroundColor: '#FEE2E2',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: '16px',
                                border: '1px solid #FECACA'
                            }}>
                                <div style={{ fontSize: '13px', color: '#991B1B' }}>
                                    <strong>⚠️ Error de Extracción IA:</strong>
                                    <div style={{ marginTop: '4px' }}>
                                        {formData.json_ia_raw.error === 'GEMINI_API_KEY_MISSING'
                                            ? 'Falta la clave API de Gemini (.env)'
                                            : `Error: ${formData.json_ia_raw.errorDetails || 'Error desconocido'}`}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="submit"
                                className="btn btn-success"
                                disabled={loading}
                                style={{ flex: 1 }}
                            >
                                {loading ? 'Guardando...' : (formData.estado === 'validada' ? '💾 Guardar Cambios' : '✓ Validar y Guardar')}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => router.push('/facturas')}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right Side - PDF Viewer (60%) */}
                <div style={{
                    width: '60%',
                    backgroundColor: '#525659',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px'
                }}>
                    {formData.url_archivo_pdf ? (
                        <iframe
                            src={formData.url_archivo_pdf}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                backgroundColor: 'white',
                                borderRadius: '8px'
                            }}
                            title="Vista previa de factura"
                        />
                    ) : (
                        <div style={{ textAlign: 'center', color: 'white' }}>
                            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📄</div>
                            <p>No hay archivo PDF disponible</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ValidarFacturaPage() {
    return (
        <Suspense fallback={
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div>Cargando...</div>
            </div>
        }>
            <ValidarFacturaContent />
        </Suspense>
    );
}
