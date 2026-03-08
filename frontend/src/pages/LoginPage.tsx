import { Field, Input, PrimaryButton } from '@/components/FormControls'
import { AuthLayout } from '@/layouts/AuthLayout'
import { useAuth } from '@/context/AuthContext'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await login({ email, password })
      navigate('/workspaces')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Access your PromptOps workspace and agent tools.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />
        </Field>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <PrimaryButton type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Signing in...' : 'Sign in'}
        </PrimaryButton>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        New here?{' '}
        <Link to="/register" className="font-medium text-sky-700">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
