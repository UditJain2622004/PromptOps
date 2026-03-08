import type { ReactNode, TextareaHTMLAttributes } from 'react'

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-sky-500 ${props.className ?? ''}`}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 ${props.className ?? ''}`}
    />
  )
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 ${props.className ?? ''}`}
    />
  )
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }
) {
  return (
    <button
      {...props}
      className={`rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${props.className ?? ''}`}
    />
  )
}

export function SecondaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }
) {
  return (
    <button
      {...props}
      className={`rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 ${props.className ?? ''}`}
    />
  )
}
