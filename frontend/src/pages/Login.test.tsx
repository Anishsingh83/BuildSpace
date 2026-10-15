import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Login from './Login'

const login = vi.hoisted(() => vi.fn())
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ login }) }))

function renderLogin(state?: { from: string }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
        <Route path="/p/demo" element={<p>Public page</p>} />
        <Route path="/signup" element={<p>Signup page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Login page', () => {
  beforeEach(() => {
    login.mockReset()
  })

  it('shows errors and does not call the API when the form is empty', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(screen.getByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('rejects a malformed email', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText('Email'), 'abc')
    await user.type(screen.getByLabelText('Password'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('logs in and goes to the dashboard', async () => {
    login.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText('Email'), 'a@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
    expect(login).toHaveBeenCalledWith('a@example.com', 'secret-pass')
  })

  it('returns to the page the visitor came from', async () => {
    login.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderLogin({ from: '/p/demo' })
    await user.type(screen.getByLabelText('Email'), 'a@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('Public page')).toBeInTheDocument()
  })

  it('shows the server message when login fails', async () => {
    login.mockRejectedValue(new Error('Invalid email or password.'))
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText('Email'), 'a@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-pass')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument()
  })
})
