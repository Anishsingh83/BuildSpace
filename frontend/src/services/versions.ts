import { api } from './api'
import type { ProjectDetail } from '../types/project'
import type { VersionDetail, VersionSummary } from '../types/versions'

const base = (projectId: string) => `/projects/${encodeURIComponent(projectId)}/versions`
const one = (projectId: string, versionId: string) =>
  `${base(projectId)}/${encodeURIComponent(versionId)}`

export const listVersions = (projectId: string) => api<VersionSummary[]>(base(projectId))

export const createVersion = (projectId: string, message: string) =>
  api<VersionSummary>(base(projectId), { method: 'POST', body: JSON.stringify({ message }) })

export const getVersion = (projectId: string, versionId: string) =>
  api<VersionDetail>(one(projectId, versionId))

export const restoreVersion = (projectId: string, versionId: string) =>
  api<ProjectDetail>(`${one(projectId, versionId)}/restore`, { method: 'POST' })

export const deleteVersion = (projectId: string, versionId: string) =>
  api<void>(one(projectId, versionId), { method: 'DELETE' })
