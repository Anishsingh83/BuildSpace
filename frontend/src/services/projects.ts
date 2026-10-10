import { api } from './api'
import type { ProjectDetail, ProjectFile, ProjectSummary, Visibility } from '../types/project'

const url = (id: string) => `/projects/${encodeURIComponent(id)}`

export const listProjects = () => api<ProjectSummary[]>('/projects')

export const createProject = (title: string, description = '') =>
  api<ProjectDetail>('/projects', {
    method: 'POST',
    body: JSON.stringify({ title, description }),
  })

export const getProject = (id: string) => api<ProjectDetail>(url(id))

export const updateProject = (
  id: string,
  changes: { title?: string; description?: string; visibility?: Visibility },
) => api<ProjectDetail>(url(id), { method: 'PATCH', body: JSON.stringify(changes) })

export const deleteProject = (id: string) => api<void>(url(id), { method: 'DELETE' })

export const duplicateProject = (id: string) =>
  api<ProjectDetail>(`${url(id)}/duplicate`, { method: 'POST' })

export const saveFiles = (id: string, files: ProjectFile[]) =>
  api<ProjectDetail>(`${url(id)}/files`, {
    method: 'PUT',
    body: JSON.stringify({ files }),
  })
