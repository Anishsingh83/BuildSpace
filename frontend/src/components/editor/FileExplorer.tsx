import { FileCode2, FilePlus } from 'lucide-react'
import type { EditorFile } from '../../types/editor'

interface Props {
  files: EditorFile[]
  activePath: string
  onSelect: (path: string) => void
  onCreate: () => void
}

export default function FileExplorer({ files, activePath, onSelect, onCreate }: Props) {
  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-sm font-semibold">Explorer</p>
        <button
          onClick={onCreate}
          aria-label="New file"
          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <FilePlus className="h-4 w-4" />
        </button>
      </div>
      <ul>
        {files.map((f) => (
          <li key={f.path}>
            <button
              onClick={() => onSelect(f.path)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                f.path === activePath
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileCode2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{f.path}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
