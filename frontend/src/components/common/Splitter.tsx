import { useRef } from 'react'

interface Props {
  /** 'col' sits between two columns (drag left/right), 'row' between two rows (drag up/down). */
  direction: 'col' | 'row'
  onMove: (clientX: number, clientY: number) => void
  /** Positive means: make the right or bottom panel bigger. */
  onNudge: (step: number) => void
  label: string
}

export default function Splitter({ direction, onMove, onNudge, label }: Props) {
  const dragging = useRef(false)
  const isCol = direction === 'col'

  return (
    <div
      role="separator"
      aria-orientation={isCol ? 'vertical' : 'horizontal'}
      aria-label={label}
      tabIndex={0}
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        e.preventDefault()
      }}
      onPointerMove={(e) => {
        if (dragging.current) onMove(e.clientX, e.clientY)
      }}
      onPointerUp={(e) => {
        dragging.current = false
        e.currentTarget.releasePointerCapture(e.pointerId)
      }}
      onPointerCancel={() => {
        dragging.current = false
      }}
      onKeyDown={(e) => {
        const step = isCol ? 2 : 20
        if (isCol && e.key === 'ArrowLeft') onNudge(step)
        else if (isCol && e.key === 'ArrowRight') onNudge(-step)
        else if (!isCol && e.key === 'ArrowUp') onNudge(step)
        else if (!isCol && e.key === 'ArrowDown') onNudge(-step)
        else return
        e.preventDefault()
      }}
      className={`shrink-0 touch-none bg-slate-200 outline-none transition-colors hover:bg-indigo-500 focus-visible:bg-indigo-500 active:bg-indigo-500 dark:bg-slate-800 ${
        isCol ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize'
      }`}
    />
  )
}
