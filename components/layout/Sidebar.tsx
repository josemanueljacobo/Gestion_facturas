'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

export default function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Dashboard', icon: '📊' },
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
