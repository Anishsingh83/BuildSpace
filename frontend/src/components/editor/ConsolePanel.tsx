import { ChevronDown, ChevronUp, Maximize2, Minimize2, Trash2 } from 'lucide-react'

export type LogLevel = 'log' | 'info' | 'warn' | 'error'
export type PanelState = 'normal' | 'minimized' | 'maximized'

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

const iconBtn = 'rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'

interface Props {
  logs: LogEntry[]
  onClear: () => void
  state: PanelState
  onToggleMinimize: () => void
  onToggleMaximize: () => void
}

export default function ConsolePanel({
  logs,
  onClear,
  state,
  onToggleMinimize,
  onToggleMaximize,
}: Props) {
  const errorCount = logs.filter((l) => l.level === 'error').length
  const minimized = state === 'minimized'
  const maximized = state === 'maximized'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Console
          {errorCount > 0 && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {errorCount}
            </span>
          )}
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={onClear} aria-label="Clear console" className={iconBtn}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggleMinimize}
            aria-label={minimized ? 'Restore console' : 'Minimize console'}
            className={iconBtn}
          >
            {minimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={onToggleMaximize}
            aria-label={maximized ? 'Restore console size' : 'Maximize console'}
            className={iconBtn}
          >
            {maximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      {!minimized && (
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
      )}
    </div>
  )
}
