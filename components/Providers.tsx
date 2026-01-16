'use client';

import { ReactNode } from 'react';
import { EmpresaProvider } from '@/lib/context/EmpresaContext';

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <EmpresaProvider>
            {children}
        </EmpresaProvider>
    );
}
