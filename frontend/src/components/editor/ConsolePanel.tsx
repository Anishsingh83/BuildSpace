import { Trash2 } from 'lucide-react'

export type LogLevel = 'log' | 'info' | 'warn' | 'error'

export interface LogEntry {
  id: number
  level: LogLevel
  text: string
}

const colors: Record<LogLevel, string> = {
  log: 'text-slate-700 dark:text-slate-300',
  info: 'text-sky-600 dark:text-sky-400',
  warn: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
}

interface Props {
  logs: LogEntry[]
  onClear: () => void
}

export default function ConsolePanel({ logs, onClear }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 dark:border-slate-800">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Console</span>
        <button
          onClick={onClear}
          aria-label="Clear console"
          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs">
        {logs.length === 0 ? (
          <p className="text-slate-500">Console output and errors from your preview appear here.</p>
        ) : (
          logs.map((l) => (
            <p key={l.id} className={`whitespace-pre-wrap break-words ${colors[l.level]}`}>
              {l.text}
            </p>
          ))
        )}
      </div>
    </div>
  )
}
