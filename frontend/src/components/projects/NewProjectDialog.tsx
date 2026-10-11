import { useEffect, useState, type FormEvent } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import { Button } from '../common/Button'
import { listTemplates } from '../../services/templates'
import type { TemplateInfo } from '../../types/templates'

interface Props {
  onSubmit: (title: string, template: string) => void
  onClose: () => void
}

const FALLBACK: TemplateInfo[] = [
  { id: 'blank', name: 'Blank', description: 'A minimal HTML, CSS and JavaScript starter.' },
]

export default function NewProjectDialog({ onSubmit, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [template, setTemplate] = useState('blank')
  const [templates, setTemplates] = useState<TemplateInfo[] | null>(null)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let cancelled = false
    listTemplates()
      .then((list) => {
        if (!cancelled) setTemplates(list)
      })
      .catch(() => {
        if (!cancelled) setTemplates(FALLBACK)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return setError('A name is required.')
    if (trimmed.length > 60) return setError('Use at most 60 characters.')
    onSubmit(trimmed, template)
  }

  return (
    <Modal title="New project" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <Input
          label="Project name"
          autoFocus
          autoComplete="off"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setError(undefined)
          }}
          error={error}
        />

        <fieldset>
          <legend className="mb-1 text-sm font-medium">Start from</legend>
          {templates === null ? (
            <p className="text-sm text-slate-500">Loading templates...</p>
          ) : (
            <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {templates.map((t) => (
                <label
                  key={t.id}
                  className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm ${
                    template === t.id
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={t.id}
                    checked={template === t.id}
                    onChange={() => setTemplate(t.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium">{t.name}</span>
                    <span className="block text-xs text-slate-500">{t.description}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Create</Button>
        </div>
      </form>
    </Modal>
  )
}
