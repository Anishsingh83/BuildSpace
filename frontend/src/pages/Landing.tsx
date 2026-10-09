import { Code2, Eye, GitFork, History, Share2, ShieldCheck } from 'lucide-react'
import { ButtonLink } from '../components/common/Button'

const features = [
  { icon: Code2, title: 'Real code editor', text: 'Write HTML, CSS and JavaScript with the same editor engine that powers VS Code.' },
  { icon: Eye, title: 'Live preview', text: 'See every change instantly in an isolated, sandboxed preview.' },
  { icon: Share2, title: 'Share with a link', text: 'Publish any project at a clean public URL.' },
  { icon: GitFork, title: 'Fork and remix', text: 'Copy any public project and make it your own.' },
  { icon: History, title: 'Version history', text: 'Save snapshots and restore earlier versions anytime.' },
  { icon: ShieldCheck, title: 'Safe by design', text: 'Your code runs isolated from the app and from other users.' },
]

export default function Landing() {
  return (
    <div>
      <section className="py-16 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Build, preview and share web apps in your browser
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
          BuildSpace is a modern coding playground. Write code, watch it run live, and share it with the world.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/signup" className="px-6 py-3">Get started free</ButtonLink>
          <ButtonLink to="/gallery" variant="secondary" className="px-6 py-3">Explore gallery</ButtonLink>
        </div>
      </section>

      <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="rounded-lg border border-slate-200 p-5 dark:border-slate-800"
          >
            <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{text}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
