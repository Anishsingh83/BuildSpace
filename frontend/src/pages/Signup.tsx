import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Input from '../components/common/Input'
import { Button } from '../components/common/Button'
import { useAuth } from '../contexts/AuthContext'
import { validateEmail, validatePassword, validateUsername } from '../utils/validation'

interface Errors {
  username?: string
  email?: string
  password?: string
  confirm?: string
}

export default function Signup() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Errors = {
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: confirm === password ? undefined : 'Passwords do not match.',
    }
    setErrors(next)
    setServerError('')
    if (Object.values(next).some(Boolean)) return

    setSubmitting(true)
    try {
      await register(username.trim(), email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign up failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Start building on BuildSpace for free.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Input
          label="Username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
        />
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </Button>
        {serverError && (
          <p role="alert" className="text-sm text-red-500">
            {serverError}
          </p>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Log in
        </Link>
      </p>
    </div>
  )
}
