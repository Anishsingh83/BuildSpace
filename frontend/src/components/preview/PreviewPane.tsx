import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2, Monitor, RefreshCw, Smartphone, Tablet } from 'lucide-react'
import type { EditorFile } from '../../types/editor'
import { buildSrcDoc } from '../../utils/buildPreview'
import type { LogEntry, LogLevel } from '../editor/ConsolePanel'

type Device = 'desktop' | 'tablet' | 'mobile'

const widths: Record<Device, string> = { desktop: '100%', tablet: '768px', mobile: '375px' }
const levels: LogLevel[] = ['log', 'info', 'warn', 'error']

interface Props {
  files: EditorFile[]
  onLog: (entry: Omit<LogEntry, 'id'>) => void
  onReset: () => void
  maximized: boolean
  onToggleMaximize: () => void
}

export default function PreviewPane({ files, onLog, onReset, maximized, onToggleMaximize }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [srcDoc, setSrcDoc] = useState(() => buildSrcDoc(files))
  const [reloadKey, setReloadKey] = useState(0)
  const [device, setDevice] = useState<Device>('desktop')

  // Rebuild the preview 500 ms after the user stops typing.
  useEffect(() => {
    const id = window.setTimeout(() => {
      onReset()
      setSrcDoc(buildSrcDoc(files))
    }, 500)
    return () => window.clearTimeout(id)
  }, [files, onReset])

  // Receive console output and errors from the sandboxed iframe.
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return
      const data = e.data
      if (!data || data.source !== 'buildspace-preview') return
      if (!levels.includes(data.level)) return
      onLog({ level: data.level as LogLevel, text: String(data.text).slice(0, 2000) })
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onLog])

  function refresh() {
    onReset()
    setSrcDoc(buildSrcDoc(files))
    setReloadKey((k) => k + 1)
  }

  const iconBtn = 'rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
  const deviceButton = (d: Device, Icon: typeof Monitor, label: string) => (
    <button
      onClick={() => setDevice(d)}
      aria-label={label}
      className={`rounded p-1 ${
        device === d
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</span>
        <div className="flex items-center gap-1">
          {deviceButton('desktop', Monitor, 'Desktop size')}
          {deviceButton('tablet', Tablet, 'Tablet size')}
          {deviceButton('mobile', Smartphone, 'Mobile size')}
          <button onClick={refresh} aria-label="Refresh preview" className={iconBtn}>
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleMaximize}
            aria-label={maximized ? 'Restore preview size' : 'Maximize preview'}
            className={iconBtn}
          >
            {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-slate-100 dark:bg-slate-900">
        <iframe
          key={reloadKey}
          ref={iframeRef}
          title="Project preview"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          className="h-full max-w-full bg-white"
          style={{ width: widths[device] }}
        />
      </div>
    </div>
  )
}
