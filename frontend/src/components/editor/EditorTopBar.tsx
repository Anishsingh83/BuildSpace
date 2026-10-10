import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Code2, Globe, Lock, Moon, Save, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import type { Visibility } from '../../types/project'

interface Props {
  projectName: string
  onRename: (name: string) => void
  hasUnsaved: boolean
  saving: boolean
  onSave: () => void
  visibility: Visibility
  onToggleVisibility: () => void
  error: string
}

export default function EditorTopBar({
  projectName,
  onRename,
  hasUnsaved,
  saving,
  onSave,
  visibility,
  onToggleVisibility,
  error,
}: Props) {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  // The parent remounts this component (key) whenever the saved name changes.
  const [draft, setDraft] = useState(projectName)

  function commitName() {
    const trimmed = draft.trim()
    if (!trimmed) setDraft(projectName)
    else if (trimmed !== projectName) onRename(trimmed)
  }

  const isPublic = visibility === 'public'

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-3 dark:border-slate-800">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to="/dashboard"
          aria-label="Back to dashboard"
          onClick={(e) => {
            if (hasUnsaved && !window.confirm('You have unsaved changes. Leave anyway?')) {
              e.preventDefault()
            }
          }}
          className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Code2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </Link>
        <input
          value={draft}
          maxLength={60}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          aria-label="Project name"
          className="w-44 rounded bg-transparent px-1 py-0.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:w-64"
        />
      </div>

      <div className="flex items-center gap-2">
        {error && (
          <span role="alert" className="hidden max-w-xs truncate text-xs text-red-500 md:block" title={error}>
            {error}
          </span>
        )}
        <button
          onClick={onToggleVisibility}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {isPublic ? 'Public' : 'Private'}
        </button>
        <button
          onClick={onSave}
          disabled={saving || !hasUnsaved}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:cursor-default disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : hasUnsaved ? 'Save' : 'Saved'}
        </button>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <div
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold uppercase text-white"
        >
          {user?.username.charAt(0) ?? '?'}
        </div>
      </div>
    </header>
  )
}
