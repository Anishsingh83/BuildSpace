import { api } from './api'
import type { TokenResponse, User } from '../types/auth'

export const updateUsername = (username: string) =>
  api<User>('/auth/me', { method: 'PATCH', body: JSON.stringify({ username }) })

export const changePassword = (currentPassword: string, newPassword: string) =>
  api<TokenResponse>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })

export const deleteAccount = (password: string) =>
  api<void>('/auth/delete-account', { method: 'POST', body: JSON.stringify({ password }) })
