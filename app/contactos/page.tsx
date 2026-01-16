'use client';

import { useState, useEffect, FormEvent } from 'react';

interface Contact {
    id: string;
    tipo: 'proveedor' | 'cliente';
    cif_nif: string;
    nombre_fiscal: string;
    nombre_comercial?: string;
    codigo_contable?: string;
    email?: string;
    direccion?: string;
    pais_iso?: string;
}

interface FormData {
    tipo: 'proveedor' | 'cliente';
    cif_nif: string;
    nombre_fiscal: string;
    nombre_comercial: string;
    codigo_contable: string;
    email: string;
    direccion: string;
    pais_iso: string;
}

interface ImportResult {
    success: number;
    duplicates: string[];
    errors: string[];
}

const initialFormData: FormData = {
    tipo: 'proveedor',
    cif_nif: '',
    nombre_fiscal: '',
    nombre_comercial: '',
    codigo_contable: '',
    email: '',
    direccion: '',
    pais_iso: 'ES',
};

const PAISES = [
    { code: 'ES', name: 'España' },
    { code: 'PT', name: 'Portugal' },
    { code: 'FR', name: 'Francia' },
    { code: 'DE', name: 'Alemania' },
    { code: 'IT', name: 'Italia' },
    { code: 'GB', name: 'Reino Unido' },
    { code: 'US', name: 'Estados Unidos' },
    { code: 'MX', name: 'México' },
    { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Chile' },
    { code: 'CO', name: 'Colombia' },
    { code: 'PE', name: 'Perú' },
];

export default function ContactosPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [formError, setFormError] = useState('');

    // Import state
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importPreview, setImportPreview] = useState<any[]>([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    useEffect(() => {
        fetchContacts();
    }, [search, filter]);

    useEffect(() => {
        if (editingContact) {
            setFormData({
                tipo: editingContact.tipo,
                cif_nif: editingContact.cif_nif,
                nombre_fiscal: editingContact.nombre_fiscal,
                nombre_comercial: editingContact.nombre_comercial || '',
                codigo_contable: editingContact.codigo_contable || '',
                email: editingContact.email || '',
                direccion: editingContact.direccion || '',
                pais_iso: editingContact.pais_iso || 'ES',
            });
        } else {
            setFormData(initialFormData);
        }
        setFormError('');
    }, [editingContact, showModal]);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            let url = '/api/contactos?';
            if (filter !== 'all') {
                url += `tipo=${filter}&`;
            }
            if (search) {
                url += `search=${encodeURIComponent(search)}`;
            }

            const res = await fetch(url);
            const data = await res.json();
            setContacts(data);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (contact: Contact) => {
        setEditingContact(contact);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este contacto?')) return;

        try {
            await fetch(`/api/contactos/${id}`, { method: 'DELETE' });
            fetchContacts();
        } catch (error) {
            alert('Error al eliminar contacto');
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingContact(null);
        setFormData(initialFormData);
        setFormError('');
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setFormError('');

        // Validation
        if (!formData.cif_nif.trim()) {
            setFormError('El CIF/NIF es obligatorio');
            return;
        }
        if (!formData.nombre_fiscal.trim()) {
            setFormError('El nombre fiscal es obligatorio');
            return;
        }

        setSaving(true);
        try {
            const url = editingContact
                ? `/api/contactos/${editingContact.id}`
                : '/api/contactos';
            const method = editingContact ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al guardar contacto');
            }

            closeModal();
            fetchContacts();
        } catch (error: any) {
            setFormError(error.message || 'Error al guardar contacto');
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Import functions
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportFile(file);
        setImportResult(null);

        // Parse file for preview
        const formData = new FormData();
        formData.append('file', file);
        formData.append('preview', 'true');

        try {
            const res = await fetch('/api/contactos/importar', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.preview) {
                setImportPreview(data.preview);
            }
        } catch (error) {
            console.error('Error parsing file:', error);
        }
    };

    const handleImport = async () => {
        if (!importFile) return;

        setImporting(true);
        setImportResult(null);

        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const res = await fetch('/api/contactos/importar', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            setImportResult(data);
            if (data.success > 0) {
                fetchContacts();
            }
        } catch (error) {
            console.error('Error importing:', error);
            setImportResult({ success: 0, duplicates: [], errors: ['Error al procesar el archivo'] });
        } finally {
            setImporting(false);
        }
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        setImportResult(null);
    };

    return (
        <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
                        Contactos
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Gestión de proveedores y clientes
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowImportModal(true)}
                    >
                        📥 Importar desde Excel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingContact(null);
                            setShowModal(true);
                        }}
                    >
                        + Nuevo Contacto
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Buscar por CIF o nombre..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div>
                        <select
                            className="form-select"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            style={{ width: '200px' }}
                        >
                            <option value="all">Todos</option>
                            <option value="proveedor">Proveedores</option>
                            <option value="cliente">Clientes</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Contacts Table */}
            {loading ? (
                <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
                    Cargando...
                </div>
            ) : contacts.length === 0 ? (
                <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        No hay contactos todavía
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowModal(true)}
                    >
                        Crear Primer Contacto
                    </button>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>CIF/NIF</th>
                                <th>Nombre Fiscal</th>
                                <th>Nombre Comercial</th>
                                <th>Tipo</th>
                                <th>Código Contable</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {contacts.map((contact) => (
                                <tr key={contact.id}>
                                    <td className="font-medium">{contact.cif_nif}</td>
                                    <td>{contact.nombre_fiscal}</td>
                                    <td>{contact.nombre_comercial || '-'}</td>
                                    <td>
                                        <span className={`badge badge-${contact.tipo === 'proveedor' ? 'proveedor' : 'cliente'}`}>
                                            {contact.tipo === 'proveedor' ? 'Proveedor' : 'Cliente'}
                                        </span>
                                    </td>
                                    <td>{contact.codigo_contable || '-'}</td>
                                    <td className="text-right">
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '6px 12px', fontSize: '13px' }}
                                                onClick={() => handleEdit(contact)}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                style={{ padding: '6px 12px', fontSize: '13px' }}
                                                onClick={() => handleDelete(contact.id)}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Contact Form Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <div className="modal-title">
                                {editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}
                            </div>
                            <button className="modal-close" onClick={closeModal}>
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Tipo *</label>
                                    <select
                                        className="form-select"
                                        value={formData.tipo}
                                        onChange={(e) => handleInputChange('tipo', e.target.value as 'proveedor' | 'cliente')}
                                    >
                                        <option value="proveedor">Proveedor</option>
                                        <option value="cliente">Cliente</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">CIF/NIF *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.cif_nif}
                                        onChange={(e) => handleInputChange('cif_nif', e.target.value)}
                                        placeholder="B12345678"
                                        disabled={!!editingContact}
                                    />
                                </div>

                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Nombre Fiscal *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.nombre_fiscal}
                                        onChange={(e) => handleInputChange('nombre_fiscal', e.target.value)}
                                        placeholder="Empresa S.L."
                                    />
                                </div>

                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Nombre Comercial</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.nombre_comercial}
                                        onChange={(e) => handleInputChange('nombre_comercial', e.target.value)}
                                        placeholder="Nombre comercial (opcional)"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Código Contable</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.codigo_contable}
                                        onChange={(e) => handleInputChange('codigo_contable', e.target.value)}
                                        placeholder="400.0.0.001"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        placeholder="contacto@empresa.com"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">País</label>
                                    <select
                                        className="form-select"
                                        value={formData.pais_iso}
                                        onChange={(e) => handleInputChange('pais_iso', e.target.value)}
                                    >
                                        {PAISES.map(pais => (
                                            <option key={pais.code} value={pais.code}>{pais.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Dirección</label>
                                    <textarea
                                        className="form-input"
                                        value={formData.direccion}
                                        onChange={(e) => handleInputChange('direccion', e.target.value)}
                                        placeholder="Calle, número, ciudad, código postal..."
                                        rows={2}
                                        style={{ resize: 'vertical' }}
                                    />
                                </div>
                            </div>

                            {formError && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '12px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '8px',
                                    color: '#ef4444',
                                    fontSize: '14px'
                                }}>
                                    {formError}
                                </div>
                            )}

                            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Guardando...' : (editingContact ? 'Guardar Cambios' : 'Crear Contacto')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="modal-overlay" onClick={closeImportModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <div className="modal-title">Importar Contactos desde Excel</div>
                            <button className="modal-close" onClick={closeImportModal}>×</button>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                Sube un archivo Excel (.xlsx, .xls) o CSV con las columnas: <strong>tipo</strong>, <strong>cif_nif</strong>, <strong>nombre_fiscal</strong>, nombre_comercial, codigo_contable, email, direccion, pais_iso
                            </p>

                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileSelect}
                                style={{
                                    padding: '12px',
                                    border: '2px dashed var(--border-color)',
                                    borderRadius: '8px',
                                    width: '100%',
                                    cursor: 'pointer'
                                }}
                            />
                        </div>

                        {/* Preview Table */}
                        {importPreview.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ marginBottom: '12px' }}>Vista previa ({importPreview.length} registros):</h4>
                                <div style={{ overflowX: 'auto', maxHeight: '200px' }}>
                                    <table className="table" style={{ fontSize: '13px' }}>
                                        <thead>
                                            <tr>
                                                <th>Tipo</th>
                                                <th>CIF/NIF</th>
                                                <th>Nombre Fiscal</th>
                                                <th>N. Comercial</th>
                                                <th>Email</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importPreview.slice(0, 5).map((row, idx) => (
                                                <tr key={idx}>
                                                    <td>{row.tipo || '-'}</td>
                                                    <td>{row.cif_nif || '-'}</td>
                                                    <td>{row.nombre_fiscal || '-'}</td>
                                                    <td>{row.nombre_comercial || '-'}</td>
                                                    <td>{row.email || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {importPreview.length > 5 && (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>
                                        ... y {importPreview.length - 5} registros más
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Import Result */}
                        {importResult && (
                            <div style={{
                                marginBottom: '20px',
                                padding: '16px',
                                background: importResult.success > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                border: `1px solid ${importResult.success > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                borderRadius: '8px'
                            }}>
                                <p style={{ fontWeight: '600', marginBottom: '8px' }}>
                                    ✅ {importResult.success} contactos importados
                                </p>
                                {importResult.duplicates.length > 0 && (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        ⚠️ Duplicados (no importados): {importResult.duplicates.join(', ')}
                                    </p>
                                )}
                                {importResult.errors.length > 0 && (
                                    <p style={{ color: '#ef4444', fontSize: '14px' }}>
                                        ❌ Errores: {importResult.errors.join(', ')}
                                    </p>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={closeImportModal}>
                                Cerrar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleImport}
                                disabled={!importFile || importing}
                            >
                                {importing ? 'Importando...' : 'Importar Contactos'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
