import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Input from '../components/common/Input'
import { Button } from '../components/common/Button'
import { useAuth } from '../contexts/AuthContext'
import { validateEmail } from '../utils/validation'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next = {
      email: validateEmail(email),
      password: password ? undefined : 'Password is required.',
    }
    setErrors(next)
    setServerError('')
    if (next.email || next.password) return

    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold tracking-tight">Log in</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Welcome back to BuildSpace.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log in'}
        </Button>
        {serverError && (
          <p role="alert" className="text-sm text-red-500">
            {serverError}
          </p>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        No account yet?{' '}
        <Link to="/signup" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Sign up
        </Link>
      </p>
    </div>
  )
}
