'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    padding: '32px',
                    textAlign: 'center',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
                        Error crítico
                    </h1>
                    <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                        Ha ocurrido un error grave. Por favor, recarga la página.
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            backgroundColor: '#EF4444',
                            color: 'white',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                        }}
                    >
                        Recargar página
                    </button>
                </div>
            </body>
        </html>
    );
}
