import { api } from './api'
import type { TemplateInfo } from '../types/templates'

export const listTemplates = () => api<TemplateInfo[]>('/templates')
