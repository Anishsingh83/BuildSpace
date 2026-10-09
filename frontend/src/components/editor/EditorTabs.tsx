import { X } from 'lucide-react'

interface Props {
  openPaths: string[]
  activePath: string
  dirtyPaths: Set<string>
  onSelect: (path: string) => void
  onClose: (path: string) => void
}

export default function EditorTabs({ openPaths, activePath, dirtyPaths, onSelect, onClose }: Props) {
  return (
    <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800">
      {openPaths.map((path) => {
        const active = path === activePath
        return (
          <div
            key={path}
            className={`flex shrink-0 items-center gap-2 border-r border-slate-200 px-3 py-2 text-sm dark:border-slate-800 ${
              active ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 text-slate-500 dark:bg-slate-950'
            }`}
          >
            <button onClick={() => onSelect(path)}>{path}</button>
            {dirtyPaths.has(path) && (
              <span aria-label="Unsaved changes" className="h-2 w-2 rounded-full bg-amber-500" />
            )}
            <button
              onClick={() => onClose(path)}
              aria-label={`Close ${path}`}
              className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
