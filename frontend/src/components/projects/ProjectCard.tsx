import { Link, useNavigate } from 'react-router-dom'
import { Copy, Globe, Lock, Pencil, Trash2 } from 'lucide-react'
import type { ProjectSummary } from '../../types/project'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface Props {
  project: ProjectSummary
  onRename: (project: ProjectSummary) => void
  onDuplicate: (project: ProjectSummary) => void
  onDelete: (project: ProjectSummary) => void
}

const iconBtn =
  'rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'

export default function ProjectCard({ project, onRename, onDuplicate, onDelete }: Props) {
  const navigate = useNavigate()
  const isPublic = project.visibility === 'public'
  const editorPath = `/editor/${project.id}`

  return (
    <article
      onClick={() => navigate(editorPath)}
      className="flex cursor-pointer flex-col rounded-lg border border-slate-200 p-5 transition-colors hover:border-indigo-400 dark:border-slate-800 dark:hover:border-indigo-500"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-semibold">
          <Link
            to={editorPath}
            onClick={(e) => e.stopPropagation()}
            className="block truncate hover:underline"
          >
            {project.title}
          </Link>
        </h3>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
          {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          {isPublic ? 'Public' : 'Private'}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-600 dark:text-slate-400">
        {project.description || 'No description.'}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">Updated {formatDate(project.updated_at)}</p>
        <div className="flex" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onRename(project)} aria-label={`Rename ${project.title}`} className={iconBtn}>
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => onDuplicate(project)} aria-label={`Duplicate ${project.title}`} className={iconBtn}>
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(project)} aria-label={`Delete ${project.title}`} className={iconBtn}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  )
}
