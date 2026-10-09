export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.'
}

export function validateUsername(value: string): string | undefined {
  if (!value.trim()) return 'Username is required.'
  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(value)) {
    return 'Use 3-30 letters, numbers, underscores or hyphens.'
  }
}

export function validatePassword(value: string): string | undefined {
  if (!value) return 'Password is required.'
  if (value.length < 8) return 'Password must be at least 8 characters.'
}
