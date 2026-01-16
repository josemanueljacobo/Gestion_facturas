'use client';

import { useState, useEffect } from 'react';

interface Departamento {
    id: string;
    nombre: string;
    codigo: number;
}

export default function DepartamentosPage() {
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [newDept, setNewDept] = useState({ nombre: '', codigo: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchDepartamentos();
    }, []);

    const fetchDepartamentos = async () => {
        try {
            const res = await fetch('/api/departamentos');
            const data = await res.json();
            setDepartamentos(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/departamentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDept),
            });

            if (res.ok) {
                setNewDept({ nombre: '', codigo: '' });
                fetchDepartamentos();
            } else {
                alert('Error al crear departamento');
            }
        } catch (error) {
            console.error(error);
            alert('Error al crear departamento');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro?')) return;
        try {
            const res = await fetch(`/api/departamentos?id=${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setDepartamentos(prev => prev.filter(d => d.id !== id));
            } else {
                alert('Error al eliminar');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleImportLocal = async () => {
        if (!confirm('¿Importar departamentos desde "Departamento.xlsx" en el servidor?')) return;
        setLoading(true);
        try {
            const res = await fetch('/api/departamentos/import-local', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                alert(`Importación completada: ${data.added} añadidos, ${data.updated} actualizados.`);
                fetchDepartamentos();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Error al importar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>
                    Gestión de Departamentos
                </h1>
                <button
                    onClick={handleImportLocal}
                    className="btn btn-secondary"
                    style={{ fontSize: '13px' }}
                >
                    📥 Importar Excel
                </button>
            </div>

            <div className="card" style={{ marginBottom: '32px' }}>
                <div className="card-header">Nuevo Departamento</div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label className="form-label">Nombre</label>
                        <input
                            type="text"
                            className="form-input"
                            value={newDept.nombre}
                            onChange={e => setNewDept(prev => ({ ...prev, nombre: e.target.value }))}
                            placeholder="Ej: Administración"
                            required
                        />
                    </div>
                    <div style={{ width: '150px' }}>
                        <label className="form-label">Código Factusol</label>
                        <input
                            type="number"
                            className="form-input"
                            value={newDept.codigo}
                            onChange={e => setNewDept(prev => ({ ...prev, codigo: e.target.value }))}
                            placeholder="Ej: 1"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Guardando...' : 'Añadir'}
                    </button>
                </form>
            </div>

            <div className="card">
                <div className="card-header">Departamentos Existentes</div>
                {loading ? (
                    <div style={{ padding: '20px', textAlign: 'center' }}>Cargando...</div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Nombre</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departamentos.map(dept => (
                                <tr key={dept.id}>
                                    <td className="font-medium">{dept.codigo}</td>
                                    <td>{dept.nombre}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            onClick={() => handleDelete(dept.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#ef4444'
                                            }}
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {departamentos.length === 0 && (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                                        No hay departamentos creados
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
