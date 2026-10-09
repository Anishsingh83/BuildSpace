import { Send, Sparkles, X } from 'lucide-react'

export default function ChatPanel({ onClose }: { onClose: () => void }) {
  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-slate-200 dark:border-slate-800 lg:flex">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Sparkles className="h-3.5 w-3.5" />
          AI Chat
        </span>
        <button
          onClick={onClose}
          aria-label="Close AI chat"
          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <Sparkles className="h-8 w-8 text-indigo-500" />
        <p className="mt-3 text-sm font-medium">AI assistant coming soon</p>
        <p className="mt-1 text-xs text-slate-500">
          It will help you write and fix code once the backend is ready.
        </p>
      </div>
      <div className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
        <input
          disabled
          placeholder="Type your message..."
          aria-label="Chat message"
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          disabled
          aria-label="Send"
          className="rounded-md bg-indigo-600 p-2 text-white opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
