import { useCallback, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Files, Sparkles } from 'lucide-react'
import FileExplorer from '../components/editor/FileExplorer'
import EditorTabs from '../components/editor/EditorTabs'
import EditorTopBar from '../components/editor/EditorTopBar'
import ConsolePanel, { type LogEntry } from '../components/editor/ConsolePanel'
import ChatPanel from '../components/editor/ChatPanel'
import PreviewPane from '../components/preview/PreviewPane'
import { languageFor, starterFiles, type EditorFile } from '../types/editor'
import { useTheme } from '../contexts/ThemeContext'

export default function EditorPage() {
  const { theme } = useTheme()
  const [projectName, setProjectName] = useState('Untitled project')
  const [files, setFiles] = useState<EditorFile[]>(starterFiles)
  const [savedContent, setSavedContent] = useState<Record<string, string>>(
    () => Object.fromEntries(starterFiles.map((f) => [f.path, f.content])),
  )
  const [openPaths, setOpenPaths] = useState<string[]>([starterFiles[0].path])
  const [activePath, setActivePath] = useState(starterFiles[0].path)
  const [chatOpen, setChatOpen] = useState(true)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const nextLogId = useRef(0)

  const handleLog = useCallback((entry: Omit<LogEntry, 'id'>) => {
    setLogs((l) => [...l.slice(-199), { ...entry, id: nextLogId.current++ }])
  }, [])
  const handleReset = useCallback(() => setLogs([]), [])

  const activeFile = files.find((f) => f.path === activePath)
  const dirtyPaths = new Set(
    files.filter((f) => f.content !== savedContent[f.path]).map((f) => f.path),
  )

  function openFile(path: string) {
    setOpenPaths((p) => (p.includes(path) ? p : [...p, path]))
    setActivePath(path)
  }

  function closeFile(path: string) {
    if (dirtyPaths.has(path) && !window.confirm(`${path} has unsaved changes. Close anyway?`)) {
      return
    }
    const remaining = openPaths.filter((p) => p !== path)
    setOpenPaths(remaining)
    if (path === activePath && remaining.length > 0) {
      setActivePath(remaining[remaining.length - 1])
    }
  }

  function createFile() {
    const name = window.prompt('New file name (for example about.html):')?.trim()
    if (!name) return
    if (!/^[A-Za-z0-9_-][A-Za-z0-9._-]{0,63}$/.test(name)) {
      window.alert('Use letters, numbers, dots, hyphens or underscores (max 64 characters).')
      return
    }
    if (files.some((f) => f.path === name)) {
      window.alert(`${name} already exists.`)
      return
    }
    setFiles((fs) => [...fs, { path: name, content: '' }])
    setSavedContent((s) => ({ ...s, [name]: '' }))
    openFile(name)
  }

  function updateContent(value: string | undefined) {
    setFiles((fs) =>
      fs.map((f) => (f.path === activePath ? { ...f, content: value ?? '' } : f)),
    )
  }

  function saveAll() {
    setSavedContent(Object.fromEntries(files.map((f) => [f.path, f.content])))
  }

  return (
    <div
      className="flex h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault()
          saveAll()
        }
      }}
    >
      <EditorTopBar
        projectName={projectName}
        onNameChange={setProjectName}
        hasUnsaved={dirtyPaths.size > 0}
        onSave={saveAll}
      />

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-slate-200 py-2 dark:border-slate-800">
          <button
            aria-label="Files"
            className="rounded-md bg-indigo-100 p-2 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
          >
            <Files className="h-5 w-5" />
          </button>
          <button
            onClick={() => setChatOpen((o) => !o)}
            aria-label="Toggle AI chat"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Sparkles className="h-5 w-5" />
          </button>
        </nav>

        <FileExplorer
          files={files}
          activePath={activePath}
          onSelect={openFile}
          onCreate={createFile}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-[3] flex-col">
            <EditorTabs
              openPaths={openPaths}
              activePath={activePath}
              dirtyPaths={dirtyPaths}
              onSelect={setActivePath}
              onClose={closeFile}
            />
            <div className="min-h-0 flex-1">
              {activeFile ? (
                <Editor
                  path={activeFile.path}
                  language={languageFor(activeFile.path)}
                  value={activeFile.content}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  onChange={updateContent}
                  options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }}
                />
              ) : (
                <p className="p-6 text-sm text-slate-500">Open a file from the explorer.</p>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-[2] flex-col border-t border-slate-200 md:flex-row dark:border-slate-800">
            <div className="min-h-0 min-w-0 flex-1">
              <PreviewPane files={files} onLog={handleLog} onReset={handleReset} />
            </div>
            <div className="min-h-0 min-w-0 flex-1 border-t border-slate-200 md:border-l md:border-t-0 dark:border-slate-800">
              <ConsolePanel logs={logs} onClear={handleReset} />
            </div>
          </div>
        </div>

        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      </div>
    </div>
  )
}
