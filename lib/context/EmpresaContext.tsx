'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Empresa {
    id: string;
    cif_nif: string;
    nombre_fiscal: string;
    nombre_comercial?: string;
}

interface EmpresaContextType {
    empresas: Empresa[];
    selectedEmpresa: Empresa | null;
    selectedEmpresaId: string | null;
    setSelectedEmpresaId: (id: string | null) => void;
    loading: boolean;
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

export function EmpresaProvider({ children }: { children: ReactNode }) {
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [selectedEmpresaId, setSelectedEmpresaIdState] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Load empresas on mount
    useEffect(() => {
        fetch('/api/empresas')
            .then(res => res.json())
            .then(data => {
                setEmpresas(data);

                // Try to restore from localStorage
                const saved = localStorage.getItem('selectedEmpresaId');
                if (saved && data.some((e: Empresa) => e.id === saved)) {
                    setSelectedEmpresaIdState(saved);
                } else if (data.length === 1) {
                    // Auto-select if only one company
                    setSelectedEmpresaIdState(data[0].id);
                    localStorage.setItem('selectedEmpresaId', data[0].id);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const setSelectedEmpresaId = (id: string | null) => {
        setSelectedEmpresaIdState(id);
        if (id) {
            localStorage.setItem('selectedEmpresaId', id);
        } else {
            localStorage.removeItem('selectedEmpresaId');
        }
    };

    const selectedEmpresa = empresas.find(e => e.id === selectedEmpresaId) || null;

    return (
        <EmpresaContext.Provider value={{
            empresas,
            selectedEmpresa,
            selectedEmpresaId,
            setSelectedEmpresaId,
            loading
        }}>
            {children}
        </EmpresaContext.Provider>
    );
}

export function useEmpresa() {
    const context = useContext(EmpresaContext);
    if (context === undefined) {
        throw new Error('useEmpresa must be used within an EmpresaProvider');
    }
    return context;
}
