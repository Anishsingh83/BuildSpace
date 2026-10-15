import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, setAccessToken, setSessionExpiredHandler } from './api'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => {
  vi.unstubAllGlobals()
  setAccessToken(null)
  setSessionExpiredHandler(null)
})

describe('api client', () => {
  it('sends the access token and the cookie, and parses JSON', async () => {
    const fetchMock = vi.fn(async () => json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('tok')

    await expect(api('/ping')).resolves.toEqual({ ok: true })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/ping')
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer tok')
    expect(init.credentials).toBe('include')
  })

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))
    await expect(api('/gone', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('refreshes once on 401 and retries with the new token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ detail: 'Not authenticated.' }, 401))
      .mockResolvedValueOnce(json({ access_token: 'fresh', token_type: 'bearer', user: {} }))
      .mockResolvedValueOnce(json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('stale')

    await expect(api('/projects')).resolves.toEqual({ ok: true })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/auth/refresh')
    const retry = fetchMock.mock.calls[2][1] as RequestInit
    expect((retry.headers as Headers).get('Authorization')).toBe('Bearer fresh')
  })

  it('signs the user out when the refresh fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ detail: 'Not authenticated.' }, 401)))
    const expired = vi.fn()
    setSessionExpiredHandler(expired)
    setAccessToken('stale')

    await expect(api('/projects')).rejects.toMatchObject({ status: 401, message: 'Not authenticated.' })
    expect(expired).toHaveBeenCalledTimes(1)
  })

  it('does not try to refresh when there was no token', async () => {
    const fetchMock = vi.fn(async () => json({ detail: 'Invalid email or password.' }, 401))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api('/auth/login', { method: 'POST', body: '{}' })).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([
    [429, /Too many requests/],
    [413, /too large/],
  ])('explains status %i in plain words', async (status, text) => {
    vi.stubGlobal('fetch', vi.fn(async () => json({}, status)))
    await expect(api('/x')).rejects.toThrow(text)
  })

  it('shows the first validation message without the "Value error" prefix', async () => {
    const body = { detail: [{ msg: 'Value error, Use 3-30 letters, numbers, underscores or hyphens.' }] }
    vi.stubGlobal('fetch', vi.fn(async () => json(body, 422)))
    await expect(api('/x')).rejects.toThrow('Use 3-30 letters, numbers, underscores or hyphens.')
  })

  it('reports an unreachable server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    await expect(api('/x')).rejects.toMatchObject({ status: 0 })
  })
})
