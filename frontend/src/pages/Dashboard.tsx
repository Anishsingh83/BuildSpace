import { useMemo, useState } from 'react'
import { FolderOpen, Plus, Search } from 'lucide-react'
import { Button } from '../components/common/Button'
import ProjectCard from '../components/projects/ProjectCard'
import { sampleProjects } from '../utils/sampleProjects'

type Sort = 'updated' | 'title'

export default function Dashboard() {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('updated')
  const projects = sampleProjects

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    )
    return [...filtered].sort((a, b) =>
      sort === 'title'
        ? a.title.localeCompare(b.title)
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }, [projects, query, sort])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your projects</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {projects.length} project{projects.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>

      {projects.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              aria-label="Search projects"
              placeholder="Search projects"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <select
            aria-label="Sort projects"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="updated">Recently updated</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <FolderOpen className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 font-semibold">No projects yet</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Create your first project to get started.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-600 dark:text-slate-400">
          No projects match "{query}".
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  )
}
