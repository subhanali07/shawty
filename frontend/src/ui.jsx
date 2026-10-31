import { AlertIcon, CheckIcon, XIcon } from './icons'
import { buttonStyles, cn } from './utils'

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }) {
  return (
    <button type={type} className={buttonStyles({ variant, size, className })} {...props} />
  )
}

export function ButtonLink({ variant = 'primary', size = 'md', className, ...props }) {
  return <a className={buttonStyles({ variant, size, className })} {...props} />
}

export function IconButton({ label, variant = 'default', className, type = 'button', ...props }) {
  const variants = {
    default:
      'border-transparent text-ink/55 hover:-translate-y-0.5 hover:border-ink hover:bg-cream hover:text-ink hover:shadow-hard-xs',
    danger:
      'border-transparent text-ink/55 hover:-translate-y-0.5 hover:border-ink hover:bg-vermilion hover:text-cream hover:shadow-hard-xs',
    success: 'border-ink bg-moss text-cream shadow-hard-xs',
  }

  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center border-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-11 w-full border-2 border-ink bg-cream px-3.5 text-sm text-ink shadow-hard-xs outline-none transition-all placeholder:text-ink/30 hover:bg-white focus:border-cobalt focus:bg-white focus:shadow-[4px_4px_0_0_#2748c8] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function Card({ className, ...props }) {
  return <div className={cn('border-2 border-ink bg-cream shadow-hard', className)} {...props} />
}

const badgeVariants = {
  default: 'border-ink/30 bg-paper text-ink/55',
  custom: 'border-ink bg-saffron text-ink',
  expired: 'border-ink/40 bg-paper text-ink/45 line-through decoration-vermilion',
  success: 'border-ink bg-moss text-cream',
}

export function Badge({ variant = 'default', className, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]',
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Spinner({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn('animate-spin', className)}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  )
}

export function Toast({ toast, onClose }) {
  if (!toast) return null

  const isError = toast.type === 'error'
  const Icon = isError ? AlertIcon : CheckIcon

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 sm:bottom-6">
      <div
        role="status"
        className="animate-toast-in pointer-events-auto flex items-center gap-3 border-2 border-ink bg-cream px-3.5 py-3 text-sm text-ink shadow-hard"
      >
        <span
          aria-hidden="true"
          className={cn('h-8 w-1.5 shrink-0 border border-ink', isError ? 'bg-vermilion' : 'bg-moss')}
        />
        <Icon className={cn('h-4 w-4 shrink-0', isError ? 'text-vermilion' : 'text-moss')} />
        <span className="max-w-xs">{toast.message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="ml-1 border-2 border-transparent p-0.5 text-ink/50 transition-colors hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
