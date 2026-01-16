interface StatusBadgeProps {
    estado: 'pendiente_revision' | 'validada' | 'exportada';
}

export default function StatusBadge({ estado }: StatusBadgeProps) {
    const badgeConfig = {
        pendiente_revision: {
            label: 'Pendiente Revisión',
            className: 'badge-pending',
        },
        validada: {
            label: 'Validada',
            className: 'badge-validated',
        },
        exportada: {
            label: 'Exportada',
            className: 'badge-exported',
        },
    };

    const config = badgeConfig[estado];

    return (
        <span className={`badge ${config.className}`}>
            {config.label}
        </span>
    );
}
