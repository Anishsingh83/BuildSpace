import { useState, type FormEvent } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import { Button } from '../common/Button'

interface Props {
  title: string
  label: string
  initialValue?: string
  submitLabel: string
  validate: (value: string) => string | undefined
  onSubmit: (value: string) => void
  onClose: () => void
}

export default function NameDialog({
  title,
  label,
  initialValue = '',
  submitLabel,
  validate,
  onSubmit,
  onClose,
}: Props) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string>()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    const problem = validate(trimmed)
    if (problem) {
      setError(problem)
      return
    }
    onSubmit(trimmed)
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <Input
          label={label}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          value={value}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            setValue(e.target.value)
            setError(undefined)
          }}
          error={error}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  )
}
