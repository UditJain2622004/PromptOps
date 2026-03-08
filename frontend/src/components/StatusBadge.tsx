function getClasses(value: string) {
  if (value === 'COMPLETED' || value === 'OWNER') return 'bg-emerald-100 text-emerald-700'
  if (value === 'RUNNING' || value === 'ADMIN') return 'bg-amber-100 text-amber-700'
  if (value === 'FAILED' || value === 'CANCELLED') return 'bg-rose-100 text-rose-700'
  if (value === 'USER') return 'bg-sky-100 text-sky-700'
  return 'bg-slate-100 text-slate-700'
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getClasses(value)}`}>
      {value}
    </span>
  )
}
