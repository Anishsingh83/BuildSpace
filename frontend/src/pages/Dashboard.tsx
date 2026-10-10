import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Plus, Search } from 'lucide-react'
import { Button } from '../components/common/Button'
import ConfirmDialog from '../components/common/ConfirmDialog'
import NameDialog from '../components/editor/NameDialog'
import ProjectCard from '../components/projects/ProjectCard'
import {
  createProject,
  deleteProject,
  duplicateProject,
  listProjects,
  updateProject,
} from '../services/projects'
import type { ProjectSummary } from '../types/project'

type Sort = 'updated' | 'title'
type DialogState =
  | { kind: 'new' }
  | { kind: 'rename'; project: ProjectSummary }
  | { kind: 'delete'; project: ProjectSummary }
  | null

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.')

function validateTitle(value: string): string | undefined {
  if (!value) return 'A name is required.'
  if (value.length > 60) return 'Use at most 60 characters.'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('updated')
  const [dialog, setDialog] = useState<DialogState>(null)

  useEffect(() => {
    let cancelled = false
    listProjects()
      .then((list) => {
        if (!cancelled) setProjects(list)
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(errorText(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = (projects ?? []).filter(
      (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    )
    return [...filtered].sort((a, b) =>
      sort === 'title'
        ? a.title.localeCompare(b.title)
        : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
  }, [projects, query, sort])

  async function run(action: () => Promise<void>) {
    setNotice('')
    try {
      await action()
    } catch (e) {
      setNotice(errorText(e))
    }
  }

  const closeDialog = () => setDialog(null)

  function handleCreate(title: string) {
    closeDialog()
    void run(async () => {
      const created = await createProject(title)
      navigate(`/editor/${created.id}`)
    })
  }

  function handleRename(project: ProjectSummary, title: string) {
    closeDialog()
    void run(async () => {
      const updated = await updateProject(project.id, { title })
      setProjects((list) => (list ?? []).map((p) => (p.id === project.id ? updated : p)))
    })
  }

  function handleDuplicate(project: ProjectSummary) {
    void run(async () => {
      const copy = await duplicateProject(project.id)
      setProjects((list) => [copy, ...(list ?? [])])
    })
  }

  function handleDelete(project: ProjectSummary) {
    closeDialog()
    void run(async () => {
      await deleteProject(project.id)
      setProjects((list) => (list ?? []).filter((p) => p.id !== project.id))
    })
  }

  const count = projects?.length ?? 0

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your projects</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {projects ? `${count} project${count === 1 ? '' : 's'}` : ' '}
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: 'new' })}>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>

      {notice && (
        <p role="alert" className="mt-4 rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-500">
          {notice}
        </p>
      )}

      {projects && count > 0 && (
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

      {loadError ? (
        <div className="mt-10 text-center">
          <p className="text-sm text-red-500">{loadError}</p>
          <Button variant="secondary" className="mt-3" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      ) : projects === null ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : count === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <FolderOpen className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 font-semibold">No projects yet</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Create your first project to get started.
          </p>
          <Button className="mt-4" onClick={() => setDialog({ kind: 'new' })}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-600 dark:text-slate-400">
          No projects match "{query}".
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onRename={(project) => setDialog({ kind: 'rename', project })}
              onDuplicate={handleDuplicate}
              onDelete={(project) => setDialog({ kind: 'delete', project })}
            />
          ))}
        </div>
      )}

      {dialog?.kind === 'new' && (
        <NameDialog
          title="New project"
          label="Project name"
          submitLabel="Create"
          validate={validateTitle}
          onSubmit={handleCreate}
          onClose={closeDialog}
        />
      )}
      {dialog?.kind === 'rename' && (
        <NameDialog
          title="Rename project"
          label="Project name"
          initialValue={dialog.project.title}
          submitLabel="Rename"
          validate={validateTitle}
          onSubmit={(name) => handleRename(dialog.project, name)}
          onClose={closeDialog}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete project?"
          message={`Delete "${dialog.project.title}" and all of its files? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(dialog.project)}
          onClose={closeDialog}
        />
      )}
    </div>
  )
}
