import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { Check, Code2, Copy, Moon, Sun } from 'lucide-react'
import PreviewPane from '../components/preview/PreviewPane'
import { useTheme } from '../contexts/ThemeContext'
import { ApiError } from '../services/api'
import { getPublicProject } from '../services/public'
import { languageFor } from '../types/editor'
import type { PublicProjectDetail } from '../types/public'

interface LoadState {
  slug: string
  project?: PublicProjectDetail
  error?: string
}

// The public page has no console, so these do nothing. Defined once so they stay stable.
const noopLog = () => undefined
const noopReset = () => undefined

export default function PublicProject() {
  const { slug } = useParams()
  const [state, setState] = useState<LoadState | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    getPublicProject(slug)
      .then((project) => {
        if (!cancelled) setState({ slug, project })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const error =
          e instanceof ApiError && e.status === 404
            ? 'This project does not exist, or it is private.'
            : e instanceof Error
              ? e.message
              : 'Something went wrong.'
        setState({ slug, error })
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const current = state && state.slug === slug ? state : null

  if (!current) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-500">
        Loading project...
      </div>
    )
  }
  if (current.error || !current.project) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-sm">
        <p className="text-red-500">{current.error}</p>
        <Link to="/gallery" className="text-indigo-600 hover:underline dark:text-indigo-400">
          Browse the gallery
        </Link>
      </div>
    )
  }
  return <Viewer key={current.project.slug} project={current.project} />
}

function Viewer({ project }: { project: PublicProjectDetail }) {
  const { theme, toggleTheme } = useTheme()
  const firstPath =
    project.files.find((f) => f.path === 'index.html')?.path ?? project.files[0]?.path ?? ''
  const [activePath, setActivePath] = useState(firstPath)
  const [mobileTab, setMobileTab] = useState<'code' | 'preview'>('preview')
  const [previewMax, setPreviewMax] = useState(false)
  const [copied, setCopied] = useState(false)
  const active = project.files.find((f) => f.path === activePath)

  async function copyLink() {
    const link = `${window.location.origin}/p/${project.slug}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this link:', link)
    }
  }

  const codeClass = previewMax ? 'hidden' : mobileTab === 'code' ? 'flex' : 'hidden lg:flex'
  const previewClass = previewMax || mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'
  const tabBtn = (id: 'code' | 'preview', label: string) => (
    <button
      onClick={() => setMobileTab(id)}
      className={`flex-1 py-2 text-sm font-medium ${
        mobileTab === id
          ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
          : 'text-slate-500'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-3 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/" aria-label="BuildSpace home" className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Code2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{project.title}</h1>
            <p className="truncate text-xs text-slate-500">by @{project.author}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <Link
            to="/gallery"
            className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block dark:text-slate-400 dark:hover:text-slate-100"
          >
            Gallery
          </Link>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {project.description && (
        <p className="shrink-0 border-b border-slate-200 px-4 py-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
          {project.description}
        </p>
      )}

      <div className="flex shrink-0 border-b border-slate-200 lg:hidden dark:border-slate-800">
        {tabBtn('code', 'Code')}
        {tabBtn('preview', 'Preview')}
      </div>

      <div className="flex min-h-0 flex-1">
        <section className={`${codeClass} min-h-0 min-w-0 flex-1 flex-col border-slate-200 lg:border-r dark:border-slate-800`}>
          <div className="flex shrink-0 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
            {project.files.map((f) => (
              <button
                key={f.path}
                onClick={() => setActivePath(f.path)}
                className={`shrink-0 border-r border-slate-200 px-3 py-2 text-sm dark:border-slate-800 ${
                  f.path === activePath
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-slate-50 text-slate-500 dark:bg-slate-950'
                }`}
              >
                {f.path}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            {active ? (
              <Editor
                path={active.path}
                language={languageFor(active.path)}
                value={active.content}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                options={{
                  readOnly: true,
                  domReadOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  automaticLayout: true,
                }}
              />
            ) : (
              <p className="p-6 text-sm text-slate-500">This project has no files.</p>
            )}
          </div>
        </section>

        <section className={`${previewClass} min-h-0 min-w-0 flex-1 flex-col`}>
          <PreviewPane
            files={project.files}
            onLog={noopLog}
            onReset={noopReset}
            maximized={previewMax}
            onToggleMaximize={() => setPreviewMax((m) => !m)}
          />
        </section>
      </div>
    </div>
  )
}
