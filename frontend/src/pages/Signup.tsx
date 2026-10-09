import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Input from '../components/common/Input'
import { Button } from '../components/common/Button'
import { validateEmail, validatePassword, validateUsername } from '../utils/validation'

interface Errors {
  username?: string
  email?: string
  password?: string
  confirm?: string
}

export default function Signup() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [notice, setNotice] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Errors = {
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: confirm === password ? undefined : 'Passwords do not match.',
    }
    setErrors(next)
    setNotice('')
    if (Object.values(next).some(Boolean)) return
    setNotice('Form is valid. The backend is not connected yet.')
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
        <Button type="submit" className="w-full">Create account</Button>
        {notice && <p className="text-sm text-emerald-500">{notice}</p>}
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
