import { api } from './api'
import type { ProjectDetail } from '../types/project'
import type { PublicProjectDetail, PublicProjectSummary } from '../types/public'

export const getPublicProject = (slug: string) =>
  api<PublicProjectDetail>(`/public/projects/${encodeURIComponent(slug)}`)

export const forkPublicProject = (slug: string) =>
  api<ProjectDetail>(`/public/projects/${encodeURIComponent(slug)}/fork`, { method: 'POST' })

export function listPublicProjects(params: {
  q: string
  sort: 'updated' | 'title'
  limit: number
  offset: number
}) {
  const qs = new URLSearchParams({
    sort: params.sort,
    limit: String(params.limit),
    offset: String(params.offset),
  })
  if (params.q) qs.set('q', params.q)
  return api<PublicProjectSummary[]>(`/public/projects?${qs.toString()}`)
}
