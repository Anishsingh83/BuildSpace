import { useCallback, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Files, Sparkles } from 'lucide-react'
import FileExplorer from '../components/editor/FileExplorer'
import EditorTabs from '../components/editor/EditorTabs'
import EditorTopBar from '../components/editor/EditorTopBar'
import ConsolePanel, { type LogEntry } from '../components/editor/ConsolePanel'
import ChatPanel from '../components/editor/ChatPanel'
import NameDialog from '../components/editor/NameDialog'
import ConfirmDialog from '../components/common/ConfirmDialog'
import PreviewPane from '../components/preview/PreviewPane'
import { languageFor, starterFiles, type EditorFile } from '../types/editor'
import { useTheme } from '../contexts/ThemeContext'
import { isUnder, remapPath, validateNewPath, validateRename } from '../utils/paths'

type DialogState =
  | { kind: 'newFile'; folder: string }
  | { kind: 'newFolder'; folder: string }
  | { kind: 'rename'; path: string; isFolder: boolean }
  | { kind: 'delete'; path: string; isFolder: boolean }
  | { kind: 'closeDirty'; path: string }
  | null

export default function EditorPage() {
  const { theme } = useTheme()
  const [projectName, setProjectName] = useState('Untitled project')
  const [files, setFiles] = useState<EditorFile[]>(starterFiles)
  const [emptyFolders, setEmptyFolders] = useState<string[]>([])
  const [savedContent, setSavedContent] = useState<Record<string, string>>(
    () => Object.fromEntries(starterFiles.map((f) => [f.path, f.content])),
  )
  const [openPaths, setOpenPaths] = useState<string[]>([starterFiles[0].path])
  const [activePath, setActivePath] = useState(starterFiles[0].path)
  const [chatOpen, setChatOpen] = useState(true)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [dialog, setDialog] = useState<DialogState>(null)
  const nextLogId = useRef(0)

  const handleLog = useCallback((entry: Omit<LogEntry, 'id'>) => {
    setLogs((l) => [...l.slice(-199), { ...entry, id: nextLogId.current++ }])
  }, [])
  const handleReset = useCallback(() => setLogs([]), [])

  const filePaths = files.map((f) => f.path)
  const activeFile = files.find((f) => f.path === activePath)
  const dirtyPaths = new Set(
    files.filter((f) => f.content !== savedContent[f.path]).map((f) => f.path),
  )
  const closeDialog = () => setDialog(null)

  function openFile(path: string) {
    setOpenPaths((p) => (p.includes(path) ? p : [...p, path]))
    setActivePath(path)
  }

  function closeTab(path: string) {
    const remaining = openPaths.filter((p) => p !== path)
    setOpenPaths(remaining)
    if (path === activePath) setActivePath(remaining[remaining.length - 1] ?? '')
  }

  function requestCloseTab(path: string) {
    if (dirtyPaths.has(path)) setDialog({ kind: 'closeDirty', path })
    else closeTab(path)
  }

  function createFile(path: string) {
    setFiles((fs) => [...fs, { path, content: '' }])
    setSavedContent((s) => ({ ...s, [path]: '' }))
    openFile(path)
  }

  function createFolder(path: string) {
    setEmptyFolders((f) => [...f, path])
  }

  function renameItem(oldPath: string, newPath: string) {
    setFiles((fs) =>
      fs.map((f) => (isUnder(f.path, oldPath) ? { ...f, path: remapPath(f.path, oldPath, newPath) } : f)),
    )
    setSavedContent((s) =>
      Object.fromEntries(Object.entries(s).map(([p, c]) => [remapPath(p, oldPath, newPath), c])),
    )
    setEmptyFolders((fs) => fs.map((f) => remapPath(f, oldPath, newPath)))
    setOpenPaths((ps) => ps.map((p) => remapPath(p, oldPath, newPath)))
    setActivePath((p) => remapPath(p, oldPath, newPath))
  }

  function deleteItem(path: string) {
    setFiles((fs) => fs.filter((f) => !isUnder(f.path, path)))
    setSavedContent((s) =>
      Object.fromEntries(Object.entries(s).filter(([p]) => !isUnder(p, path))),
    )
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
          emptyFolders={emptyFolders}
          activePath={activePath}
          onSelect={openFile}
          onNewFile={(folder) => setDialog({ kind: 'newFile', folder })}
          onNewFolder={(folder) => setDialog({ kind: 'newFolder', folder })}
          onRename={(path, isFolder) => setDialog({ kind: 'rename', path, isFolder })}
          onDelete={(path, isFolder) => setDialog({ kind: 'delete', path, isFolder })}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-[3] flex-col">
            <EditorTabs
              openPaths={openPaths}
              activePath={activePath}
              dirtyPaths={dirtyPaths}
              onSelect={setActivePath}
              onClose={requestCloseTab}
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
            createFolder(v)
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
          validate={(v) =>
            validateRename(dialog.path, v, dialog.isFolder, filePaths, emptyFolders)
          }
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
              ? `Delete the folder "${dialog.path}" and everything inside it? This cannot be undone.`
              : `Delete "${dialog.path}"? This cannot be undone.`
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

      {dialog?.kind === 'closeDirty' && (
        <ConfirmDialog
          title="Close with unsaved changes?"
          message={`"${dialog.path}" has unsaved changes. They will be lost if you leave this page.`}
          confirmLabel="Close anyway"
          onConfirm={() => {
            closeTab(dialog.path)
            closeDialog()
          }}
          onClose={closeDialog}
        />
      )}
    </div>
  )
}
