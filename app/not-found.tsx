import Link from 'next/link';

export default function NotFound() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: '32px',
            textAlign: 'center',
        }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
                Página no encontrada
            </h1>
            <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                La página que buscas no existe o ha sido movida.
            </p>
            <Link
                href="/"
                style={{
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                }}
            >
                Volver al inicio
            </Link>
        </div>
    );
}
