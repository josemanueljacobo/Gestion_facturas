'use client';

import { useState, useEffect } from 'react';

interface Empresa {
    id: string;
    cif_nif: string;
    nombre_fiscal: string;
    nombre_comercial?: string;
    direccion?: string;
    email?: string;
    telefono?: string;
}

export default function EmpresasPage() {
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        cif_nif: '',
        nombre_fiscal: '',
        nombre_comercial: '',
        direccion: '',
        email: '',
        telefono: '',
    });

    useEffect(() => {
        fetchEmpresas();
    }, []);

    const fetchEmpresas = async () => {
        try {
            const res = await fetch('/api/empresas');
            const data = await res.json();
            setEmpresas(data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const url = editingId ? `/api/empresas/${editingId}` : '/api/empresas';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const error = await res.json();
                alert(error.error || 'Error al guardar');
                return;
            }

            alert(editingId ? '✅ Empresa actualizada' : '✅ Empresa creada');
            setShowForm(false);
            setEditingId(null);
            setFormData({ cif_nif: '', nombre_fiscal: '', nombre_comercial: '', direccion: '', email: '', telefono: '' });
            fetchEmpresas();
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar la empresa');
        }
    };

    const handleEdit = (empresa: Empresa) => {
        setFormData({
            cif_nif: empresa.cif_nif,
            nombre_fiscal: empresa.nombre_fiscal,
            nombre_comercial: empresa.nombre_comercial || '',
            direccion: empresa.direccion || '',
            email: empresa.email || '',
            telefono: empresa.telefono || '',
        });
        setEditingId(empresa.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta empresa?')) return;

        try {
            const res = await fetch(`/api/empresas/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchEmpresas();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '700' }}>🏢 Empresas</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Gestiona las empresas que emiten o reciben facturas
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setShowForm(true);
                        setEditingId(null);
                        setFormData({ cif_nif: '', nombre_fiscal: '', nombre_comercial: '', direccion: '', email: '', telefono: '' });
                    }}
                >
                    + Nueva Empresa
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        width: '500px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <h2 style={{ marginBottom: '20px' }}>
                            {editingId ? 'Editar Empresa' : 'Nueva Empresa'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">CIF/NIF *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.cif_nif}
                                    onChange={(e) => setFormData({ ...formData, cif_nif: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nombre Fiscal *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.nombre_fiscal}
                                    onChange={(e) => setFormData({ ...formData, nombre_fiscal: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nombre Comercial</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.nombre_comercial}
                                    onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Dirección</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.direccion}
                                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Teléfono</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    {editingId ? 'Guardar Cambios' : 'Crear Empresa'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowForm(false)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div>Cargando...</div>
            ) : empresas.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '48px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '12px'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
                    <h3>No hay empresas</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Crea tu primera empresa para empezar a gestionar facturas
                    </p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>CIF/NIF</th>
                                <th>Nombre Fiscal</th>
                                <th>Nombre Comercial</th>
                                <th>Email</th>
                                <th>Teléfono</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {empresas.map((empresa) => (
                                <tr key={empresa.id}>
                                    <td style={{ fontFamily: 'monospace' }}>{empresa.cif_nif}</td>
                                    <td>{empresa.nombre_fiscal}</td>
                                    <td>{empresa.nombre_comercial || '-'}</td>
                                    <td>{empresa.email || '-'}</td>
                                    <td>{empresa.telefono || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => handleEdit(empresa)}
                                                style={{ padding: '6px 12px', fontSize: '13px' }}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                className="btn"
                                                onClick={() => handleDelete(empresa.id)}
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
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
