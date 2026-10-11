import type { ProjectFile } from './project'

export interface VersionSummary {
  id: string
  version_number: number
  message: string
  is_auto: boolean
  created_at: string
  file_count: number
}

export interface VersionDetail extends VersionSummary {
  files: ProjectFile[]
}
