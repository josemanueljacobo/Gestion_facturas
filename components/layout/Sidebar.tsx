'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';
import { useEmpresa } from '@/lib/context/EmpresaContext';

export default function Sidebar() {
    const pathname = usePathname();
    const { empresas, selectedEmpresa, selectedEmpresaId, setSelectedEmpresaId, loading } = useEmpresa();

    const navItems = [
        { href: '/', label: 'Dashboard', icon: '📊' },
        { href: '/empresas', label: 'Empresas', icon: '🏛️' },
        { href: '/facturas', label: 'Facturas', icon: '📄' },
        { href: '/contactos', label: 'Contactos', icon: '👥' },
        { href: '/departamentos', label: 'Departamentos', icon: '🏢' },
        { href: '/registro', label: 'Registro', icon: '📚' },
        { href: '/exportar', label: 'Exportar', icon: '📤' },
    ];

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logo}>
                <div className={styles.logoIcon}>📋</div>
                <div className={styles.logoText}>
                    <div className={styles.logoTitle}>Facturas</div>
                    <div className={styles.logoSubtitle}>AI Manager</div>
                </div>
            </div>

            {/* Company Selector */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                marginBottom: '8px'
            }}>
                <label style={{
                    display: 'block',
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    Empresa Activa
                </label>
                {loading ? (
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                        Cargando...
                    </div>
                ) : empresas.length === 0 ? (
                    <Link
                        href="/empresas"
                        style={{
                            display: 'block',
                            padding: '8px 12px',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            color: '#FCD34D',
                            fontSize: '13px',
                            textDecoration: 'none'
                        }}
                    >
                        + Crear empresa
                    </Link>
                ) : (
                    <select
                        value={selectedEmpresaId || ''}
                        onChange={(e) => setSelectedEmpresaId(e.target.value || null)}
                        style={{
                            width: '100%',
                            padding: '8px 10px',
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="" style={{ backgroundColor: '#1e293b' }}>Seleccionar...</option>
                        {empresas.map((empresa) => (
                            <option
                                key={empresa.id}
                                value={empresa.id}
                                style={{ backgroundColor: '#1e293b' }}
                            >
                                {empresa.nombre_comercial || empresa.nombre_fiscal}
                            </option>
                        ))}
                    </select>
                )}
                {selectedEmpresa && (
                    <div style={{
                        marginTop: '6px',
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.5)'
                    }}>
                        CIF: {selectedEmpresa.cif_nif}
                    </div>
                )}
            </div>

            <nav className={styles.nav}>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
                    >
                        <span className={styles.navIcon}>{item.icon}</span>
                        <span className={styles.navLabel}>{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className={styles.footer}>
                <div className={styles.footerText}>v1.0.0</div>
            </div>
        </aside>
    );
}
