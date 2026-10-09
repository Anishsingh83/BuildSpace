import { Link } from 'react-router-dom'
import { Code2, Moon, Pencil, Save, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

interface Props {
  projectName: string
  onNameChange: (name: string) => void
  hasUnsaved: boolean
  onSave: () => void
}

export default function EditorTopBar({ projectName, onNameChange, hasUnsaved, onSave }: Props) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" aria-label="Back to dashboard" className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
          <Code2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </Link>
        <div className="flex items-center gap-2">
          <input
            value={projectName}
            onChange={(e) => onNameChange(e.target.value.slice(0, 60))}
            aria-label="Project name"
            className="w-44 rounded bg-transparent px-1 py-0.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Pencil className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <Save className="h-4 w-4" />
          {hasUnsaved ? 'Save*' : 'Saved'}
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
          className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white"
        >
          A
        </div>
      </div>
    </header>
  )
}
