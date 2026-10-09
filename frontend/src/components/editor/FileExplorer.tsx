import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FilePlus,
  Folder,
  FolderPlus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { buildTree, type TreeNode } from '../../utils/paths'
import type { EditorFile } from '../../types/editor'

interface Actions {
  onSelect: (path: string) => void
  onNewFile: (folder: string) => void
  onNewFolder: (folder: string) => void
  onRename: (path: string, isFolder: boolean) => void
  onDelete: (path: string, isFolder: boolean) => void
}

interface Props extends Actions {
  files: EditorFile[]
  emptyFolders: string[]
  activePath: string
}

const iconBtn = 'rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
const reveal = 'flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'

interface ItemProps extends Actions {
  node: TreeNode
  depth: number
  activePath: string
  collapsed: Set<string>
  onToggle: (path: string) => void
}

function TreeItem({ node, depth, activePath, collapsed, onToggle, ...actions }: ItemProps) {
  if (!node.isFolder) {
    const active = node.path === activePath
    return (
      <li>
        <div
          className={`group flex items-center pr-1 ${
            active
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <button
            onClick={() => actions.onSelect(node.path)}
            style={{ paddingLeft: `${depth * 12 + 26}px` }}
            className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm"
          >
            <FileCode2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{node.name}</span>
          </button>
          <div className={reveal}>
            <button onClick={() => actions.onRename(node.path, false)} aria-label={`Rename ${node.path}`} className={iconBtn}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => actions.onDelete(node.path, false)} aria-label={`Delete ${node.path}`} className={iconBtn}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </li>
    )
  }

  const isOpen = !collapsed.has(node.path)
  return (
    <li>
      <div className="group flex items-center pr-1 hover:bg-slate-100 dark:hover:bg-slate-800">
        <button
          onClick={() => onToggle(node.path)}
          aria-expanded={isOpen}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left text-sm"
        >
          {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <Folder className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="truncate">{node.name}</span>
        </button>
        <div className={reveal}>
          <button onClick={() => actions.onNewFile(node.path)} aria-label={`New file in ${node.path}`} className={iconBtn}>
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => actions.onNewFolder(node.path)} aria-label={`New folder in ${node.path}`} className={iconBtn}>
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => actions.onRename(node.path, true)} aria-label={`Rename ${node.path}`} className={iconBtn}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => actions.onDelete(node.path, true)} aria-label={`Delete ${node.path}`} className={iconBtn}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {isOpen && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              collapsed={collapsed}
              onToggle={onToggle}
              {...actions}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function FileExplorer({ files, emptyFolders, activePath, ...actions }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const tree = useMemo(
    () => buildTree(files.map((f) => f.path), emptyFolders),
    [files, emptyFolders],
  )

  function toggle(path: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <aside className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-sm font-semibold">Explorer</p>
        <div className="flex">
          <button onClick={() => actions.onNewFile('')} aria-label="New file" className={iconBtn}>
            <FilePlus className="h-4 w-4" />
          </button>
          <button onClick={() => actions.onNewFolder('')} aria-label="New folder" className={iconBtn}>
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>
      </div>
      {tree.length === 0 ? (
        <p className="px-3 py-2 text-xs text-slate-500">No files yet. Use the buttons above to add one.</p>
      ) : (
        <ul>
          {tree.map((node) => (
            <TreeItem
              key={node.path}
              node={node}
              depth={0}
              activePath={activePath}
              collapsed={collapsed}
              onToggle={toggle}
              {...actions}
            />
          ))}
        </ul>
      )}
    </aside>
  )
}
