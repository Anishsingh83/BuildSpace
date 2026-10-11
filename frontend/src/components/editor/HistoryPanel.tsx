import { useState, type FormEvent } from 'react'
import { ChevronsRight, Clock, Eye, Maximize2, Minimize2, Minus, RotateCcw, Trash2 } from 'lucide-react'
import type { VersionSummary } from '../../types/versions'

export type HistoryState = 'normal' | 'minimized' | 'maximized'

interface Props {
  versions: VersionSummary[] | null
  error: string
  busy: boolean
  previewId: string | null
  state: HistoryState
  onStateChange: (state: HistoryState) => void
  onSave: (message: string) => Promise<boolean>
  onPreview: (version: VersionSummary) => void
  onRestore: (version: VersionSummary) => void
  onDelete: (version: VersionSummary) => void
  onClose: () => void
}

const iconBtn = 'rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function HistoryPanel({
  versions,
  error,
  busy,
  previewId,
  state,
  onStateChange,
  onSave,
  onPreview,
  onRestore,
  onDelete,
  onClose,
}: Props) {
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (await onSave(message.trim())) setMessage('')
  }

  if (state === 'minimized') {
    return (
      <button
        onClick={() => onStateChange('normal')}
        aria-label="Expand history panel"
        title="Expand history"
        className="flex w-9 shrink-0 flex-col items-center gap-3 border-l border-slate-200 py-3 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
      >
        <ChevronsRight className="h-4 w-4 rotate-180" />
        <Clock className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide [writing-mode:vertical-rl]">
          History
        </span>
      </button>
    )
  }

  const maximized = state === 'maximized'

  return (
    <aside
      className={`flex min-h-0 flex-col border-l border-slate-200 dark:border-slate-800 ${
        maximized ? 'min-w-0 flex-1' : 'h-full w-full'
      }`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          History
        </span>
        <div className="flex">
          <button onClick={() => onStateChange('minimized')} aria-label="Minimize history" className={iconBtn}>
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => onStateChange(maximized ? 'normal' : 'maximized')}
            aria-label={maximized ? 'Restore history size' : 'Maximize history'}
            className={iconBtn}
          >
            {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button onClick={onClose} aria-label="Close history" className={iconBtn}>
            <span aria-hidden="true" className="px-1 text-base leading-none">×</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex shrink-0 gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
        <input
          value={message}
          maxLength={200}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Version name (optional)"
          aria-label="Version name"
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? 'Saving...' : 'Save version'}
        </button>
      </form>

      {error && (
        <p role="alert" className="shrink-0 border-b border-slate-200 px-3 py-2 text-xs text-red-500 dark:border-slate-800">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {versions === null ? (
          <p className="p-4 text-sm text-slate-500">Loading...</p>
        ) : versions.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">
            No versions yet. Save one to be able to go back to this point later.
          </p>
        ) : (
          <ul>
            {versions.map((v) => (
              <li
                key={v.id}
                className={`border-b border-slate-200 px-3 py-2.5 dark:border-slate-800 ${
                  v.id === previewId ? 'bg-amber-500/10' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      v{v.version_number} · {v.message || 'Saved version'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatTime(v.created_at)} · {v.file_count} file{v.file_count === 1 ? '' : 's'}
                      {v.is_auto && (
                        <span className="ml-2 rounded-full border border-slate-300 px-1.5 py-0.5 text-[10px] dark:border-slate-700">
                          automatic
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    <button onClick={() => onPreview(v)} aria-label={`Preview version ${v.version_number}`} className={iconBtn}>
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => onRestore(v)} aria-label={`Restore version ${v.version_number}`} className={iconBtn}>
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(v)} aria-label={`Delete version ${v.version_number}`} className={iconBtn}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
