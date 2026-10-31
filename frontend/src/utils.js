export function cn(...values) {
  return values.filter(Boolean).join(' ')
}

const buttonVariants = {
  primary:
    'border-2 border-ink bg-vermilion text-cream shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
  secondary:
    'border-2 border-ink bg-cream text-ink shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-saffron hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
  accent:
    'border-2 border-ink bg-saffron text-ink shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
  ghost:
    'border-2 border-transparent text-ink/60 hover:border-ink hover:bg-cream hover:text-ink hover:shadow-hard-xs',
  danger:
    'border-2 border-ink bg-vermilion text-cream shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
}

const buttonSizes = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-5 text-sm',
  icon: 'h-8 w-8',
}

export function buttonStyles({ variant = 'primary', size = 'md', className } = {}) {
  return cn(
    'inline-flex select-none items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-40',
    buttonVariants[variant],
    buttonSizes[size],
    className,
  )
}
