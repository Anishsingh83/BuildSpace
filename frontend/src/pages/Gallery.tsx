import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Sparkles } from 'lucide-react'
import { Button } from '../components/common/Button'
import { listPublicProjects } from '../services/public'
import type { PublicProjectSummary } from '../types/public'

type Sort = 'updated' | 'title'
const PAGE = 24

interface Result {
  key: string
  items: PublicProjectSummary[]
  hasMore: boolean
  error: string
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.')

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function Gallery() {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [sort, setSort] = useState<Sort>('updated')
  const [result, setResult] = useState<Result | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState('')

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 300)
    return () => window.clearTimeout(id)
  }, [query])

  // The result remembers which search it belongs to, so a stale answer is never shown.
  const key = `${sort}|${debounced}`
  const current = result && result.key === key ? result : null

  useEffect(() => {
    let cancelled = false
    listPublicProjects({ q: debounced, sort, limit: PAGE, offset: 0 })
      .then((list) => {
        if (!cancelled) {
          setResult({ key, items: list, hasMore: list.length === PAGE, error: '' })
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setResult({ key, items: [], hasMore: false, error: errorText(e) })
      })
    return () => {
      cancelled = true
    }
  }, [key, debounced, sort])

  async function loadMore() {
    if (!current || loadingMore) return
    setLoadingMore(true)
    setMoreError('')
    try {
      const more = await listPublicProjects({
        q: debounced,
        sort,
        limit: PAGE,
        offset: current.items.length,
      })
      setResult((r) => {
        if (!r || r.key !== key) return r
        const known = new Set(r.items.map((i) => i.slug))
        return {
          ...r,
          items: [...r.items, ...more.filter((m) => !known.has(m.slug))],
          hasMore: more.length === PAGE,
        }
      })
    } catch (e) {
      setMoreError(errorText(e))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Community gallery</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Projects shared by the BuildSpace community.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            aria-label="Search public projects"
            placeholder="Search by title, description or author"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <select
          aria-label="Sort public projects"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="updated">Recently updated</option>
          <option value="title">Title (A-Z)</option>
        </select>
      </div>

      {current === null ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : current.error ? (
        <p role="alert" className="mt-10 text-center text-sm text-red-500">
          {current.error}
        </p>
      ) : current.items.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <Sparkles className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 font-semibold">
            {debounced ? 'No projects match your search' : 'Nothing shared yet'}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {debounced
              ? 'Try a different word.'
              : 'Make one of your projects public and it will show up here.'}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {current.items.map((p) => (
              <Link
                key={p.slug}
                to={`/p/${p.slug}`}
                className="flex flex-col rounded-lg border border-slate-200 p-5 transition-colors hover:border-indigo-400 dark:border-slate-800 dark:hover:border-indigo-500"
              >
                <h3 className="truncate font-semibold">{p.title}</h3>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-600 dark:text-slate-400">
                  {p.description || 'No description.'}
                </p>
                <p className="mt-4 text-xs text-slate-500">
                  by @{p.author} · Updated {formatDate(p.updated_at)}
                </p>
              </Link>
            ))}
          </div>
          {moreError && (
            <p role="alert" className="mt-4 text-center text-sm text-red-500">
              {moreError}
            </p>
          )}
          {current.hasMore && (
            <div className="mt-6 text-center">
              <Button variant="secondary" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
