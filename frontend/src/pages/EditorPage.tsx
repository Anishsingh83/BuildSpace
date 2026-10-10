import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { Files, Maximize2, Minimize2, Sparkles } from 'lucide-react'
import FileExplorer from '../components/editor/FileExplorer'
import EditorTabs from '../components/editor/EditorTabs'
import EditorTopBar from '../components/editor/EditorTopBar'
import ConsolePanel, { type LogEntry, type PanelState } from '../components/editor/ConsolePanel'
import ChatPanel from '../components/editor/ChatPanel'
import NameDialog from '../components/editor/NameDialog'
import ConfirmDialog from '../components/common/ConfirmDialog'
import Splitter from '../components/common/Splitter'
import PreviewPane from '../components/preview/PreviewPane'
import { languageFor, type EditorFile } from '../types/editor'
import type { ProjectDetail, Visibility } from '../types/project'
import { useTheme } from '../contexts/ThemeContext'
import { ApiError } from '../services/api'
import { getProject, saveFiles, updateProject } from '../services/projects'
import { isUnder, remapPath, validateNewPath, validateRename } from '../utils/paths'

type DialogState =
  | { kind: 'newFile'; folder: string }
  | { kind: 'newFolder'; folder: string }
  | { kind: 'rename'; path: string; isFolder: boolean }
  | { kind: 'delete'; path: string; isFolder: boolean }
  | { kind: 'makePublic' }
  | null

type Focus = 'none' | 'editor' | 'preview'

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.')
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export default function EditorPage() {
  const { projectId } = useParams()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    getProject(projectId)
      .then((p) => {
        if (!cancelled) setProject(p)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof ApiError && e.status === 404 ? 'Project not found.' : errorText(e))
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-sm">
        <p className="text-red-500">{error}</p>
        <Link to="/dashboard" className="text-indigo-600 hover:underline dark:text-indigo-400">
          Back to dashboard
        </Link>
      </div>
    )
  }
  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-500">
        Loading project...
      </div>
    )
  }
  return <Workspace key={project.id} project={project} />
}

function Workspace({ project }: { project: ProjectDetail }) {
  const { theme } = useTheme()
  const [title, setTitle] = useState(project.title)
  const [visibility, setVisibility] = useState<Visibility>(project.visibility)
  const [files, setFiles] = useState<EditorFile[]>(project.files)
  const [emptyFolders, setEmptyFolders] = useState<string[]>([])
  const [savedContent, setSavedContent] = useState<Record<string, string>>(() =>
    Object.fromEntries(project.files.map((f) => [f.path, f.content])),
  )
  const firstPath =
    project.files.find((f) => f.path === 'index.html')?.path ?? project.files[0]?.path ?? ''
  const [openPaths, setOpenPaths] = useState<string[]>(firstPath ? [firstPath] : [])
  const [activePath, setActivePath] = useState(firstPath)
  const [chatOpen, setChatOpen] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [dialog, setDialog] = useState<DialogState>(null)
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')

  // Layout state
  const [previewPct, setPreviewPct] = useState(50)
  const [consoleHeight, setConsoleHeight] = useState(220)
  const [consoleState, setConsoleState] = useState<PanelState>('normal')
  const [focus, setFocus] = useState<Focus>('none')
  const areaRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const nextLogId = useRef(0)

  const handleLog = useCallback((entry: Omit<LogEntry, 'id'>) => {
    setLogs((l) => [...l.slice(-199), { ...entry, id: nextLogId.current++ }])
  }, [])
  const handleReset = useCallback(() => setLogs([]), [])

  const filePaths = files.map((f) => f.path)
  const activeFile = files.find((f) => f.path === activePath)
  // Dirty means "different from what is stored in the database".
  const dirtyPaths = new Set(
    files.filter((f) => f.content !== savedContent[f.path]).map((f) => f.path),
  )
  const hasDeleted = Object.keys(savedContent).some((p) => !filePaths.includes(p))
  const hasUnsaved = dirtyPaths.size > 0 || hasDeleted
  const closeDialog = () => setDialog(null)

  useEffect(() => {
    if (!hasUnsaved) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasUnsaved])

  // ----- layout helpers -----
  function moveColumnSplitter(clientX: number) {
    const rect = rowRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    setPreviewPct(clamp(((rect.right - clientX) / rect.width) * 100, 20, 80))
  }

  function moveRowSplitter(clientY: number) {
    const rect = areaRef.current?.getBoundingClientRect()
    if (!rect) return
    setConsoleHeight(clamp(rect.bottom - clientY, 80, Math.max(120, rect.height - 140)))
  }

  function toggleFocus(target: 'editor' | 'preview') {
    setFocus((f) => (f === target ? 'none' : target))
    setConsoleState((s) => (s === 'maximized' ? 'normal' : s))
  }

  function toggleConsoleMinimize() {
    setConsoleState((s) => (s === 'minimized' ? 'normal' : 'minimized'))
  }

  function toggleConsoleMaximize() {
    setConsoleState((s) => (s === 'maximized' ? 'normal' : 'maximized'))
  }

  // ----- saving and project actions -----
  async function save() {
    if (saving || !hasUnsaved) return
    const snapshot = files
    setSaving(true)
    setApiError('')
    try {
      await saveFiles(project.id, snapshot)
      setSavedContent(Object.fromEntries(snapshot.map((f) => [f.path, f.content])))
    } catch (e) {
      setApiError(errorText(e))
    } finally {
      setSaving(false)
    }
  }

  async function renameProject(name: string) {
    setApiError('')
    try {
      const updated = await updateProject(project.id, { title: name })
      setTitle(updated.title)
    } catch (e) {
      setApiError(errorText(e))
    }
  }

  async function applyVisibility(next: Visibility) {
    setApiError('')
    try {
      const updated = await updateProject(project.id, { visibility: next })
      setVisibility(updated.visibility)
    } catch (e) {
      setApiError(errorText(e))
    }
  }

  function toggleVisibility() {
    if (visibility === 'private') setDialog({ kind: 'makePublic' })
    else void applyVisibility('private')
  }

  // ----- file operations -----
  function openFile(path: string) {
    setOpenPaths((p) => (p.includes(path) ? p : [...p, path]))
    setActivePath(path)
  }

  function closeTab(path: string) {
    const remaining = openPaths.filter((p) => p !== path)
    setOpenPaths(remaining)
    if (path === activePath) setActivePath(remaining[remaining.length - 1] ?? '')
  }

  function createFile(path: string) {
    setFiles((fs) => [...fs, { path, content: '' }])
    openFile(path)
  }

  function renameItem(oldPath: string, newPath: string) {
    setFiles((fs) =>
      fs.map((f) => (isUnder(f.path, oldPath) ? { ...f, path: remapPath(f.path, oldPath, newPath) } : f)),
    )
    setEmptyFolders((fs) => fs.map((f) => remapPath(f, oldPath, newPath)))
    setOpenPaths((ps) => ps.map((p) => remapPath(p, oldPath, newPath)))
    setActivePath((p) => remapPath(p, oldPath, newPath))
  }

  function deleteItem(path: string) {
    setFiles((fs) => fs.filter((f) => !isUnder(f.path, path)))
    setEmptyFolders((fs) => fs.filter((f) => !isUnder(f, path)))
    const remaining = openPaths.filter((p) => !isUnder(p, path))
    setOpenPaths(remaining)
    if (isUnder(activePath, path)) setActivePath(remaining[remaining.length - 1] ?? '')
  }

  function updateContent(value: string | undefined) {
    setFiles((fs) =>
      fs.map((f) => (f.path === activePath ? { ...f, content: value ?? '' } : f)),
    )
  }

  const consoleMaximized = consoleState === 'maximized'
  const editorHidden = focus === 'preview'
  const previewHidden = focus === 'editor'
  const bothVisible = focus === 'none'

  return (
    <div
      className="flex h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault()
          void save()
        }
      }}
    >
      <EditorTopBar
        key={title}
        projectName={title}
        onRename={(name) => void renameProject(name)}
        hasUnsaved={hasUnsaved}
        saving={saving}
        onSave={() => void save()}
        visibility={visibility}
        slug={project.slug}
        onToggleVisibility={toggleVisibility}
        error={apiError}
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
            className={`rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${
              chatOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
            }`}
          >
            <Sparkles className="h-5 w-5" />
          </button>
        </nav>

        <FileExplorer
          files={files}
          emptyFolders={emptyFolders}
          activePath={activePath}
          onSelect={openFile}
          onNewFile={(folder) => setDialog({ kind: 'newFile', folder })}
          onNewFolder={(folder) => setDialog({ kind: 'newFolder', folder })}
          onRename={(path, isFolder) => setDialog({ kind: 'rename', path, isFolder })}
          onDelete={(path, isFolder) => setDialog({ kind: 'delete', path, isFolder })}
        />

        <div ref={areaRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Top row: editor on the left, preview on the right */}
          <div
            ref={rowRef}
            className={`${consoleMaximized ? 'hidden' : 'flex'} min-h-0 flex-1`}
          >
            <section
              className={`${editorHidden ? 'hidden' : 'flex'} min-h-0 min-w-0 flex-col ${
                focus === 'editor' ? 'flex-1' : ''
              }`}
              style={bothVisible ? { flex: `0 0 ${100 - previewPct}%` } : undefined}
            >
              <div className="flex items-stretch">
                <div className="min-w-0 flex-1">
                  <EditorTabs
                    openPaths={openPaths}
                    activePath={activePath}
                    dirtyPaths={dirtyPaths}
                    onSelect={setActivePath}
                    onClose={closeTab}
                  />
                </div>
                <button
                  onClick={() => toggleFocus('editor')}
                  aria-label={focus === 'editor' ? 'Restore editor size' : 'Maximize editor'}
                  className="border-b border-slate-200 px-2.5 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  {focus === 'editor' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>
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
            </section>

            {bothVisible && (
              <Splitter
                direction="col"
                label="Resize editor and preview"
                onMove={(x) => moveColumnSplitter(x)}
                onNudge={(step) => setPreviewPct((p) => clamp(p + step, 20, 80))}
              />
            )}

            <section
              className={`${previewHidden ? 'hidden' : 'flex'} min-h-0 min-w-0 flex-1 flex-col`}
            >
              <PreviewPane
                files={files}
                onLog={handleLog}
                onReset={handleReset}
                maximized={focus === 'preview'}
                onToggleMaximize={() => toggleFocus('preview')}
              />
            </section>
          </div>

          {/* Bottom panel: console, full width like the VS Code terminal */}
          {consoleState === 'normal' && (
            <Splitter
              direction="row"
              label="Resize console"
              onMove={(_x, y) => moveRowSplitter(y)}
              onNudge={(step) =>
                setConsoleHeight((h) => clamp(h + step, 80, Math.max(120, window.innerHeight - 260)))
              }
            />
          )}
          <div
            className={`flex flex-col border-t border-slate-200 dark:border-slate-800 ${
              consoleMaximized ? 'min-h-0 flex-1' : 'shrink-0'
            }`}
            style={consoleState === 'normal' ? { height: consoleHeight } : undefined}
          >
            <ConsolePanel
              logs={logs}
              onClear={handleReset}
              state={consoleState}
              onToggleMinimize={toggleConsoleMinimize}
              onToggleMaximize={toggleConsoleMaximize}
            />
          </div>
        </div>

        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      </div>

      {dialog?.kind === 'newFile' && (
        <NameDialog
          title={dialog.folder ? `New file in ${dialog.folder}/` : 'New file'}
          label="File path"
          initialValue={dialog.folder ? dialog.folder + '/' : ''}
          submitLabel="Create"
          validate={(v) => validateNewPath(v, filePaths, emptyFolders)}
          onSubmit={(v) => {
            createFile(v)
            closeDialog()
          }}
          onClose={closeDialog}
        />
      )}

      {dialog?.kind === 'newFolder' && (
        <NameDialog
          title={dialog.folder ? `New folder in ${dialog.folder}/` : 'New folder'}
          label="Folder path"
          initialValue={dialog.folder ? dialog.folder + '/' : ''}
          submitLabel="Create"
          validate={(v) => validateNewPath(v, filePaths, emptyFolders)}
          onSubmit={(v) => {
            setEmptyFolders((f) => [...f, v])
            closeDialog()
          }}
          onClose={closeDialog}
        />
      )}

      {dialog?.kind === 'rename' && (
        <NameDialog
          title={dialog.isFolder ? 'Rename or move folder' : 'Rename or move file'}
          label="New path"
          initialValue={dialog.path}
          submitLabel="Rename"
          validate={(v) => validateRename(dialog.path, v, dialog.isFolder, filePaths, emptyFolders)}
          onSubmit={(v) => {
            renameItem(dialog.path, v)
            closeDialog()
          }}
          onClose={closeDialog}
        />
      )}

      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title={dialog.isFolder ? 'Delete folder?' : 'Delete file?'}
          message={
            dialog.isFolder
              ? `Delete the folder "${dialog.path}" and everything inside it? Click Save afterwards to apply this.`
              : `Delete "${dialog.path}"? Click Save afterwards to apply this.`
          }
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            deleteItem(dialog.path)
            closeDialog()
          }}
          onClose={closeDialog}
        />
      )}

      {dialog?.kind === 'makePublic' && (
        <ConfirmDialog
          title="Make project public?"
          message="Anyone with the link can read this project's code and run its preview, and it will appear in the public gallery."
          confirmLabel="Make public"
          onConfirm={() => {
            void applyVisibility('public')
            closeDialog()
          }}
          onClose={closeDialog}
        />
      )}
    </div>
  )
}

