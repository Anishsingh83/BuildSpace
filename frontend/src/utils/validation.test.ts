import { describe, expect, it } from 'vitest'
import { validateEmail, validatePassword, validateUsername } from './validation'

describe('validateEmail', () => {
  it('accepts a normal address', () => {
    expect(validateEmail('a@example.com')).toBeUndefined()
  })
  it('rejects empty and malformed addresses', () => {
    expect(validateEmail('')).toBe('Email is required.')
    expect(validateEmail('   ')).toBe('Email is required.')
    expect(validateEmail('abc')).toBe('Enter a valid email address.')
    expect(validateEmail('a@b')).toBe('Enter a valid email address.')
  })
})

describe('validateUsername', () => {
  it('accepts letters, numbers, underscores and hyphens', () => {
    expect(validateUsername('anish_dev')).toBeUndefined()
    expect(validateUsername('a-b-c')).toBeUndefined()
  })
  it('rejects too short, too long, empty and unusual characters', () => {
    expect(validateUsername('')).toBe('Username is required.')
    expect(validateUsername('ab')).toBeTypeOf('string')
    expect(validateUsername('a'.repeat(31))).toBeTypeOf('string')
    expect(validateUsername('a b')).toBeTypeOf('string')
    expect(validateUsername('a@b')).toBeTypeOf('string')
  })
})

describe('validatePassword', () => {
  it('requires 8 or more characters', () => {
    expect(validatePassword('')).toBe('Password is required.')
    expect(validatePassword('short')).toBe('Password must be at least 8 characters.')
    expect(validatePassword('long-enough')).toBeUndefined()
  })
})
