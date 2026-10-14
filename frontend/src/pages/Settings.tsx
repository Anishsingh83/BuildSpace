import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../components/common/Input'
import { Button } from '../components/common/Button'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { useAuth } from '../contexts/AuthContext'
import { changePassword, deleteAccount, updateUsername } from '../services/account'
import { validatePassword, validateUsername } from '../utils/validation'

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.')

function Section({ title, description, danger, children }: {
  title: string
  description: string
  danger?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={`rounded-lg border p-5 ${
        danger ? 'border-red-500/50' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <h2 className={`font-semibold ${danger ? 'text-red-500' : ''}`}>{title}</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Message({ error, success }: { error: string; success: string }) {
  if (error) return <p role="alert" className="text-sm text-red-500">{error}</p>
  if (success) return <p role="status" className="text-sm text-emerald-500">{success}</p>
  return null
}

export default function Settings() {
  const { user, updateUser, adoptSession, clearSession } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState(user?.username ?? '')
  const [usernameError, setUsernameError] = useState('')
  const [profileMsg, setProfileMsg] = useState({ error: '', success: '' })
  const [profileBusy, setProfileBusy] = useState(false)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwErrors, setPwErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [pwMsg, setPwMsg] = useState({ error: '', success: '' })
  const [pwBusy, setPwBusy] = useState(false)

  const [deletePw, setDeletePw] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  if (!user) return null

  async function saveUsername(e: FormEvent) {
    e.preventDefault()
    setProfileMsg({ error: '', success: '' })
    const problem = validateUsername(username)
    setUsernameError(problem ?? '')
    if (problem) return
    setProfileBusy(true)
    try {
      const updated = await updateUsername(username.trim())
      updateUser(updated)
      setUsername(updated.username)
      setProfileMsg({ error: '', success: 'Username updated.' })
    } catch (err) {
      setProfileMsg({ error: errorText(err), success: '' })
    } finally {
      setProfileBusy(false)
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault()
    setPwMsg({ error: '', success: '' })
    const errors = {
      current: current ? undefined : 'Enter your current password.',
      next: validatePassword(next),
      confirm: confirm === next ? undefined : 'Passwords do not match.',
    }
    setPwErrors(errors)
    if (errors.current || errors.next || errors.confirm) return
    setPwBusy(true)
    try {
      adoptSession(await changePassword(current, next))
      setCurrent('')
      setNext('')
      setConfirm('')
      setPwMsg({ error: '', success: 'Password changed. You were signed out everywhere else.' })
    } catch (err) {
      setPwMsg({ error: errorText(err), success: '' })
    } finally {
      setPwBusy(false)
    }
  }

  function askDelete(e: FormEvent) {
    e.preventDefault()
    if (!deletePw) {
      setDeleteError('Enter your password to continue.')
      return
    }
    setDeleteError('')
    setConfirmingDelete(true)
  }

  async function doDelete() {
    setConfirmingDelete(false)
    setDeleteBusy(true)
    try {
      await deleteAccount(deletePw)
      clearSession()
      navigate('/', { replace: true })
    } catch (err) {
      setDeleteError(errorText(err))
      setDeleteBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Signed in as {user.email}</p>
      </div>

      <Section title="Profile" description="Your username appears on public projects and in the gallery.">
        <form onSubmit={saveUsername} noValidate className="space-y-3">
          <Input
            label="Username"
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              setUsernameError('')
            }}
            error={usernameError}
          />
          <Button type="submit" disabled={profileBusy}>
            {profileBusy ? 'Saving...' : 'Save username'}
          </Button>
          <Message {...profileMsg} />
        </form>
      </Section>

      <Section
        title="Change password"
        description="You will stay signed in here, and every other device will be signed out."
      >
        <form onSubmit={savePassword} noValidate className="space-y-3">
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            error={pwErrors.current}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            error={pwErrors.next}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={pwErrors.confirm}
          />
          <Button type="submit" disabled={pwBusy}>
            {pwBusy ? 'Changing...' : 'Change password'}
          </Button>
          <Message {...pwMsg} />
        </form>
      </Section>

      <Section
        danger
        title="Delete account"
        description="This permanently deletes your account, all your projects and their version history. Forks other people made of your projects are kept. This cannot be undone."
      >
        <form onSubmit={askDelete} noValidate className="space-y-3">
          <Input
            label="Password to confirm"
            type="password"
            autoComplete="current-password"
            value={deletePw}
            onChange={(e) => {
              setDeletePw(e.target.value)
              setDeleteError('')
            }}
          />
          <Button type="submit" variant="danger" disabled={deleteBusy}>
            {deleteBusy ? 'Deleting...' : 'Delete my account'}
          </Button>
          <Message error={deleteError} success="" />
        </form>
      </Section>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete your account?"
          message="Everything you have created on BuildSpace will be permanently deleted."
          confirmLabel="Delete forever"
          danger
          onConfirm={() => void doDelete()}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}
