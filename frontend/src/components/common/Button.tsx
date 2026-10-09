import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost'

const base =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
  secondary:
    'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
  ghost:
    'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant
}

export function ButtonLink({ variant = 'primary', className = '', ...props }: ButtonLinkProps) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />
}
