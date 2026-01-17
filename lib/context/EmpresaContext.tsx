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
    refreshEmpresas: () => Promise<void>;
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

export function EmpresaProvider({ children }: { children: ReactNode }) {
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [selectedEmpresaId, setSelectedEmpresaIdState] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshEmpresas = async () => {
        try {
            const res = await fetch('/api/empresas');
            const data = await res.json();
            setEmpresas(data);

            // Try to restore from localStorage or auto-select
            const saved = localStorage.getItem('selectedEmpresaId');
            if (saved && data.some((e: Empresa) => e.id === saved)) {
                // If the previously selected company still exists, keep it
                 // We don't need to do anything as selectedEmpresaId state persists, 
                 // but checking validity is good practice if we want to be strict.
                 // However, the original logic had this inside the fetch, so let's reproduce "auto-select if single" logic carefully.
                 // Actually, let's keep it simple: just update the list. 
                 // But wait, the original logic had an auto-select feature on mount.
            } else if (data.length === 1 && !saved) {
                // Auto-select if only one company and nothing selected
                 setSelectedEmpresaIdState(data[0].id);
                 localStorage.setItem('selectedEmpresaId', data[0].id);
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
        }
    };

    // Load empresas on mount
    useEffect(() => {
        refreshEmpresas().finally(() => setLoading(false));
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
            loading,
            refreshEmpresas
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
