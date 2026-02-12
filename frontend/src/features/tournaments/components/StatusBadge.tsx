interface StatusBadgeProps {
  status: 'DRAFT' | 'OPEN' | 'RUNNING' | 'FINISHED';
}

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  DRAFT: {
    label: 'Rascunho',
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
  OPEN: {
    label: 'Inscricoes abertas',
    className: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  },
  RUNNING: {
    label: 'Em andamento',
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  FINISHED: {
    label: 'Finalizado',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={[
        'inline-block text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border',
        config.className,
      ].join(' ')}
    >
      {config.label}
    </span>
  );
}
