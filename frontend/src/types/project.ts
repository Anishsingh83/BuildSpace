export type Visibility = 'private' | 'public'

export interface ProjectSummary {
  id: string
  title: string
  slug: string
  description: string
  visibility: Visibility
  forked_from_id: string | null
  created_at: string
  updated_at: string
}

export interface ProjectFile {
  path: string
  content: string
}

export interface ProjectDetail extends ProjectSummary {
  files: ProjectFile[]
}
