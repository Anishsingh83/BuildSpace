export type Visibility = 'private' | 'public'

export interface Project {
  id: string
  title: string
  description: string
  visibility: Visibility
  updatedAt: string
}
