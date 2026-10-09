import { Globe, Lock } from 'lucide-react'
import type { Project } from '../../types/project'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function ProjectCard({ project }: { project: Project }) {
  const isPublic = project.visibility === 'public'

  return (
    <article className="rounded-lg border border-slate-200 p-5 transition-colors hover:border-indigo-400 dark:border-slate-800 dark:hover:border-indigo-500">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{project.title}</h3>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
          {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          {isPublic ? 'Public' : 'Private'}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
        {project.description}
      </p>
      <p className="mt-4 text-xs text-slate-500">Updated {formatDate(project.updatedAt)}</p>
    </article>
  )
}
