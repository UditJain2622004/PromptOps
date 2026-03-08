import { Field, Input, PrimaryButton } from '@/components/FormControls'
import { AuthLayout } from '@/layouts/AuthLayout'
import { useAuth } from '@/context/AuthContext'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await register({ name, email, password })
      navigate('/workspaces')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Create account" subtitle="Set up access to workspaces, agents, evaluations, and reports.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Full name">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="PromptOps Admin"
            required
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </Field>
        <Field label="Password" hint="Minimum 8 characters">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Choose a strong password"
            minLength={8}
            required
          />
        </Field>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <PrimaryButton type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Creating account...' : 'Create account'}
        </PrimaryButton>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-sky-700">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
