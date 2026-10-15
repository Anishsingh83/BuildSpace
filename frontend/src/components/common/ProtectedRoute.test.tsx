import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ProtectedRoute from './ProtectedRoute'

const auth = vi.hoisted(() => ({
  value: { user: null as { username: string } | null, loading: false },
}))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth.value }))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/secret" element={<p>Secret page</p>} />
        </Route>
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('waits while the session is being restored', () => {
    auth.value = { user: null, loading: true }
    renderAt('/secret')
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Secret page')).not.toBeInTheDocument()
  })

  it('sends logged-out visitors to the login page', () => {
    auth.value = { user: null, loading: false }
    renderAt('/secret')
    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Secret page')).not.toBeInTheDocument()
  })

  it('shows the page to a logged-in user', () => {
    auth.value = { user: { username: 'alice' }, loading: false }
    renderAt('/secret')
    expect(screen.getByText('Secret page')).toBeInTheDocument()
  })
})
