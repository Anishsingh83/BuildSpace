import type { ProjectFile } from './project'

export interface ForkedFrom {
  slug: string
  title: string
  author: string
}

export interface PublicProjectSummary {
  slug: string
  title: string
  description: string
  author: string
  created_at: string
  updated_at: string
}

export interface PublicProjectDetail extends PublicProjectSummary {
  files: ProjectFile[]
  forked_from: ForkedFrom | null
}
