import './globals.css'
import type { Metadata } from 'next'
import Sidebar from '@/components/layout/Sidebar'

export const metadata: Metadata = {
    title: 'Sistema de Gestión de Facturas',
    description: 'Gestión inteligente de facturas con IA y exportación a Factusol',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="es">
            <body>
                <div style={{ display: 'flex', minHeight: '100vh' }}>
                    <Sidebar />
                    <main style={{ flex: 1, marginLeft: '240px' }}>
                        {children}
                    </main>
                </div>
            </body>
        </html>
    )
}
