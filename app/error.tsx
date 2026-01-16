'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Application error:', error);
    }, [error]);

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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
                Algo salió mal
            </h1>
            <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.
            </p>
            <button
                onClick={() => reset()}
                style={{
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                }}
            >
                Reintentar
            </button>
        </div>
    );
}
