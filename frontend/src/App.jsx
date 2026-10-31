import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  CodeIcon,
  CopyIcon,
  ExternalLinkIcon,
  LinkIcon,
  PointerIcon,
  RefreshIcon,
  SearchIcon,
  TrashIcon,
  TrendIcon,
} from './icons'
import { Badge, Button, ButtonLink, Card, IconButton, Input, Spinner, Toast } from './ui'
import { cn } from './utils'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''
const OWNER_KEY = 'shawty:owner'
const OWNER_PATTERN = /^[A-Za-z0-9_-]{16,128}$/
let memoryOwner = ''

function randomOwnerToken() {
  if (window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(24)
    window.crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  return `shawty-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`
}

function getOwnerToken() {
  if (typeof window === 'undefined') return ''
  try {
    const stored = window.localStorage.getItem(OWNER_KEY)
    if (stored && OWNER_PATTERN.test(stored)) return stored
    const token = randomOwnerToken()
    window.localStorage.setItem(OWNER_KEY, token)
    return token
  } catch {
    if (!memoryOwner) memoryOwner = randomOwnerToken()
    return memoryOwner
  }
}

const filters = [
  { value: 'all', label: 'All' },
  { value: 'custom', label: 'Custom' },
  { value: 'expired', label: 'Expired' },
]

const rowTones = [
  'bg-saffron text-ink',
  'bg-vermilion text-cream',
  'bg-cobalt text-cream',
  'bg-moss text-cream',
]

async function api(path, options = {}) {
  const { headers, ...rest } = options
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'X-Shawty-Owner': getOwnerToken(),
      ...headers,
    },
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') message = body.detail
      else if (Array.isArray(body.detail)) message = body.detail[0]?.msg ?? message
    } catch (err) {
      void err
    }
    throw new Error(message)
  }
  if (res.status === 204) return null
  return res.json()
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(el)
  if (!copied) throw new Error('Copy failed')
}

function parseDate(value) {
  if (!value) return null
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`)
}

function timeAgo(value) {
  const date = parseDate(value)
  if (!date) return ''
  const diff = Date.now() - date.getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}

function formatDate(value) {
  return parseDate(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function prettyShort(url) {
  return url.replace(/^https?:\/\//, '')
}

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (typeof value !== 'number') return

    let frame
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      frame = requestAnimationFrame(() => setDisplay(value))
      return () => cancelAnimationFrame(frame)
    }

    const started = performance.now()
    const tick = (now) => {
      const progress = Math.min((now - started) / 650, 1)
      const eased = 1 - (1 - progress) ** 3
      setDisplay(Math.round(value * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <>{display.toLocaleString()}</>
}

const markStyle = {
  backgroundImage:
    'conic-gradient(from -90deg, var(--color-vermilion) 0 25%, var(--color-saffron) 25% 50%, var(--color-cobalt) 50% 75%, var(--color-cream) 75% 100%)',
}

function Mark() {
  return (
    <span
      aria-hidden="true"
      className="block h-8 w-8 shrink-0 rounded-full border-2 border-ink shadow-hard-xs transition-transform duration-300 group-hover:rotate-90"
      style={markStyle}
    />
  )
}

function BreezeIntro({ leaving, onDone }) {
  return (
    <div
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if (leaving && event.target === event.currentTarget) onDone()
      }}
      className={cn(
        'fixed inset-0 z-[100] overflow-hidden bg-paper',
        leaving && 'animate-breeze-out pointer-events-none will-change-transform',
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(23,20,15,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(23,20,15,0.055) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />
      <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full border-2 border-ink/10 bg-saffron/45" />
      <div className="absolute -left-20 bottom-20 h-56 w-56 rounded-full border-2 border-cobalt/25" />
      <div className="absolute bottom-[20%] right-[16%] h-0 w-0 border-b-[58px] border-l-[46px] border-r-[46px] border-b-vermilion/60 border-l-transparent border-r-transparent" />

      <div className="absolute inset-x-0 top-0 flex h-2" aria-hidden="true">
        <span className="flex-1 bg-vermilion" />
        <span className="flex-1 bg-saffron" />
        <span className="flex-1 bg-cobalt" />
      </div>

      <div className="absolute inset-x-0 top-[36%] overflow-hidden" aria-hidden="true">
        <div className="animate-gust h-[2px] w-[24%] bg-ink/10" />
        <div className="animate-gust mt-10 h-[2px] w-[16%] bg-vermilion/50 [animation-delay:120ms]" />
        <div className="animate-gust mt-8 h-[2px] w-[30%] bg-cobalt/30 [animation-delay:240ms]" />
      </div>

      <div
        className={cn(
          'relative flex h-full flex-col items-center justify-center px-6 transition-all duration-500 ease-out',
          leaving && 'translate-x-16 -skew-x-6 opacity-0',
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className="animate-wind-in block h-10 w-10 rounded-full border-2 border-ink shadow-hard-xs sm:h-12 sm:w-12"
            style={markStyle}
          />
          <span className="animate-wind-in font-display text-4xl font-bold tracking-tight [animation-delay:60ms] sm:text-6xl">
            shawty<span className="text-vermilion">.</span>
          </span>
        </div>
        <div className="animate-wind-in mt-5 flex items-center gap-2 border-2 border-ink bg-cream px-2.5 py-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.22em] shadow-hard-xs [animation-delay:140ms]">
          <span className="h-2 w-2 border border-ink bg-vermilion" />
          links, shortened
        </div>
      </div>

      <div className="absolute inset-y-0 left-0 flex" aria-hidden="true">
        <span className="h-full w-2 bg-vermilion" />
        <span className="h-full w-2 bg-saffron" />
        <span className="h-full w-2 bg-cobalt" />
      </div>
    </div>
  )
}

function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-paper" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(23,20,15,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(23,20,15,0.055) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />
      <div className="animate-drift absolute -right-24 -top-28 h-80 w-80 rounded-full border-2 border-ink/10 bg-saffron/35" />
      <div className="animate-float absolute -left-20 top-[44%] h-48 w-48 rounded-full border-2 border-cobalt/20" />
      <div
        className="animate-float absolute bottom-28 right-[6%] h-16 w-16 rotate-12 border-2 border-vermilion/25"
        style={{ animationDelay: '1.4s' }}
      />
    </div>
  )
}

function CreditBadge({ compact = false, active = true, observe = false, className }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(!observe)

  useEffect(() => {
    if (!observe) return undefined
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.6 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [observe])

  const revealed = active && inView

  return (
    <a
      ref={ref}
      href="https://subhanali.xyz"
      target="_blank"
      rel="noreferrer"
      className={cn(
        'group relative inline-flex shrink-0 items-center overflow-hidden border-2 border-ink bg-saffron font-display font-bold normal-case tracking-normal text-ink shadow-hard transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:rotate-1 hover:bg-vermilion hover:text-cream hover:shadow-hard-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        compact ? 'gap-1.5 px-2 py-1.5 text-[11px] sm:px-2.5 sm:text-xs' : 'gap-2.5 px-4 py-2.5 text-sm sm:text-base',
        revealed ? 'animate-credit-whoosh' : 'opacity-0',
        className,
      )}
    >
      <span className="credit-sheen" aria-hidden="true" />
      {compact ? (
        <span className="relative z-10">
          <span className="hidden sm:inline">Made by </span>
          Subhan Ali
        </span>
      ) : (
        <>
          <span className="relative z-10 grid h-6 w-6 shrink-0 place-items-center border-2 border-ink bg-cream font-mono text-[9px] font-bold">
            SA
          </span>
          <span className="relative z-10">Made by Subhan Ali</span>
        </>
      )}
      <ExternalLinkIcon
        className={cn(
          'relative z-10 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5',
          compact ? 'h-3.5 w-3.5' : 'h-4 w-4',
        )}
      />
    </a>
  )
}

function Header({ introDone }) {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="/" className="group flex items-center gap-2.5">
          <Mark />
          <span className="font-display text-xl font-bold tracking-tight">
            shawty<span className="text-vermilion">.</span>
          </span>
        </a>

        <nav className="flex items-center gap-2 sm:gap-6">
          <a
            href="#shorten"
            className="group relative hidden text-[10px] font-bold uppercase tracking-[0.18em] text-ink/55 transition-colors hover:text-ink sm:inline-block"
          >
            Shorten
            <span className="absolute inset-x-0 -bottom-1 h-0.5 origin-left scale-x-0 bg-vermilion transition-transform duration-200 group-hover:scale-x-100" />
          </a>
          <a
            href="#links"
            className="group relative hidden text-[10px] font-bold uppercase tracking-[0.18em] text-ink/55 transition-colors hover:text-ink sm:inline-block"
          >
            Links
            <span className="absolute inset-x-0 -bottom-1 h-0.5 origin-left scale-x-0 bg-cobalt transition-transform duration-200 group-hover:scale-x-100" />
          </a>
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            aria-label="API docs"
            className="inline-flex items-center gap-1.5 border-2 border-ink bg-cream px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink shadow-hard-xs transition-all duration-150 hover:-translate-y-0.5 hover:bg-saffron hover:shadow-hard active:translate-y-0.5 active:shadow-none"
          >
            <CodeIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">API</span>
          </a>
          <CreditBadge compact active={introDone} />
        </nav>
      </div>
    </header>
  )
}

function StatRow({ icon: Icon, label, value, tone, iconTone = 'text-ink' }) {
  return (
    <div className="group flex items-center gap-3.5 px-4 py-4 transition-colors hover:bg-paper/60">
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink shadow-hard-xs transition-transform duration-200 group-hover:-rotate-6',
          tone,
        )}
      >
        <Icon className={cn('h-4 w-4', iconTone)} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink/45">{label}</p>
        <p className="truncate font-display text-2xl font-bold leading-tight tracking-tight">
          {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
        </p>
      </div>
    </div>
  )
}

function StatsPanel({ stats }) {
  const topShare =
    stats?.top_link && stats.total_clicks > 0
      ? Math.round((stats.top_link.clicks / stats.total_clicks) * 100)
      : 0

  return (
    <Card className="animate-rise overflow-hidden [animation-delay:120ms]">
      <div className="flex items-center justify-between border-b-2 border-ink bg-cream px-4 py-3">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.16em]">Your stats</h2>
        <div className="flex items-center gap-1" aria-hidden="true">
          <span className="h-2.5 w-2.5 border border-ink bg-vermilion" />
          <span className="h-2.5 w-2.5 border border-ink bg-saffron" />
          <span className="h-2.5 w-2.5 border border-ink bg-cobalt" />
        </div>
      </div>

      <div className="divide-y-2 divide-ink/10">
        <StatRow
          icon={LinkIcon}
          label="Links"
          tone="bg-saffron"
          value={typeof stats?.total_links === 'number' ? stats.total_links : '—'}
        />
        <StatRow
          icon={PointerIcon}
          label="Clicks"
          tone="bg-vermilion"
          iconTone="text-cream"
          value={typeof stats?.total_clicks === 'number' ? stats.total_clicks : '—'}
        />
        <StatRow
          icon={TrendIcon}
          label="Top link"
          tone="bg-cobalt"
          iconTone="text-cream"
          value={
            stats?.top_link ? (
              <a
                href={stats.top_link.short_url}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-2 underline-offset-4 transition-colors hover:text-cobalt"
              >
                {stats.top_link.code}
              </a>
            ) : (
              '—'
            )
          }
        />
      </div>

      {stats?.top_link && stats.total_clicks > 0 && (
        <div className="border-t-2 border-ink/10 px-4 py-3">
          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.16em] text-ink/45">
            <span>Top link share</span>
            <span className="font-mono tracking-normal text-ink/70">{topShare}%</span>
          </div>
          <div className="mt-2 h-2 border border-ink bg-paper" aria-hidden="true">
            <div className="animate-grow-x h-full bg-cobalt" style={{ width: `${topShare}%` }} />
          </div>
        </div>
      )}
    </Card>
  )
}

function ResultCard({ created, copied, onCopy }) {
  return (
    <div className="animate-stamp mt-4 border-2 border-ink bg-saffron p-4 shadow-hard sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em]">
            <CheckIcon className="h-3.5 w-3.5" />
            Link ready
          </div>
          <a
            href={created.short_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block truncate font-mono text-sm font-semibold underline-offset-4 hover:underline"
          >
            {prettyShort(created.short_url)}
          </a>
          <p className="truncate text-[11px] text-ink/55">{created.original_url}</p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={() => onCopy(created.short_url, created.code)}>
            {copied === created.code ? (
              <>
                <CheckIcon className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <CopyIcon className="h-4 w-4" />
                Copy
              </>
            )}
          </Button>
          <ButtonLink
            href={created.short_url}
            target="_blank"
            rel="noreferrer"
            variant="ghost"
            size="icon"
            aria-label="Open short link"
            title="Open short link"
          >
            <ExternalLinkIcon className="h-4 w-4" />
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}

function LinkRow({ link, index, copied, onCopy, onDelete }) {
  const isCopied = copied === link.code

  return (
    <li className="group relative">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 origin-center scale-y-0 bg-vermilion transition-transform duration-200 group-hover:scale-y-100"
      />

      <div className="flex items-start gap-3 px-4 py-4 transition-colors group-hover:bg-paper/50 sm:gap-4">
        <span
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink font-mono text-[10px] font-bold shadow-hard-xs transition-transform duration-200 group-hover:-rotate-6',
            rowTones[index % rowTones.length],
          )}
        >
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <a
              href={link.short_url}
              target="_blank"
              rel="noreferrer"
              className="max-w-full truncate font-mono text-sm font-semibold underline-offset-4 hover:underline hover:decoration-2 hover:decoration-vermilion"
            >
              {prettyShort(link.short_url)}
            </a>
            {link.is_custom && <Badge variant="custom">custom</Badge>}
            {link.is_expired && <Badge variant="expired">expired</Badge>}
          </div>

          <p className="mt-0.5 truncate text-xs text-ink/45" title={link.original_url}>
            {link.original_url}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-ink/45">
            <span className="inline-flex items-center gap-1">
              <PointerIcon className="h-3 w-3" />
              {link.clicks} click{link.clicks === 1 ? '' : 's'}
            </span>
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              {timeAgo(link.created_at)}
            </span>
            {link.expires_at && (
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="h-3 w-3" />
                {link.is_expired ? 'expired' : 'expires'} {formatDate(link.expires_at)}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            label="Copy short link"
            variant={isCopied ? 'success' : 'default'}
            onClick={() => onCopy(link.short_url, link.code)}
          >
            {isCopied ? (
              <CheckIcon className="h-4 w-4" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
          </IconButton>
          <ButtonLink
            href={link.short_url}
            target="_blank"
            rel="noreferrer"
            variant="ghost"
            size="icon"
            aria-label="Open short link"
            title="Open short link"
            className="hidden sm:inline-flex"
          >
            <ExternalLinkIcon className="h-4 w-4" />
          </ButtonLink>
          <IconButton label="Delete link" variant="danger" onClick={() => onDelete(link)}>
            <TrashIcon className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </li>
  )
}

function EmptyState({ filtered = false }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="relative h-16 w-16" aria-hidden="true">
        <span className="absolute left-0 top-0 h-10 w-10 rounded-full border-2 border-ink bg-saffron" />
        <span className="absolute bottom-0 right-0 h-9 w-9 border-2 border-ink bg-cobalt shadow-hard-xs" />
        <span className="absolute bottom-1 left-1 h-0 w-0 border-b-[18px] border-l-[14px] border-r-[14px] border-b-vermilion border-l-transparent border-r-transparent" />
      </div>
      <p className="mt-4 font-display text-base font-bold">
        {filtered ? 'No matching links' : 'No links yet'}
      </p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-ink/50">
        {filtered
          ? 'Try another search term or filter.'
          : 'Shorten your first URL above and it will stay in this browser.'}
      </p>
    </div>
  )
}

function DeleteDialog({ link, deleting, onCancel, onConfirm }) {
  if (!link) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-ink/40 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        className="animate-scale-in relative w-full max-w-sm border-2 border-ink bg-cream shadow-hard-lg"
      >
        <div aria-hidden="true" className="h-2 border-b-2 border-ink bg-vermilion" />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-vermilion text-cream shadow-hard-xs">
              <TrashIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 id="delete-title" className="font-display text-xl font-bold">
                Delete this link?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink/55">
                This removes <span className="font-mono text-ink">/{link.code}</span> and its click
                count. This can’t be undone.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={onCancel} disabled={deleting} autoFocus>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm} disabled={deleting}>
              {deleting ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Deleting
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

export default function App() {
  const [introDone, setIntroDone] = useState(prefersReducedMotion)
  const [introLeaving, setIntroLeaving] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [url, setUrl] = useState('')
  const [alias, setAlias] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('')
  const [links, setLinks] = useState([])
  const [stats, setStats] = useState(null)
  const [created, setCreated] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState(null)
  const [toast, setToast] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const showToast = useCallback((type, message) => {
    setToast({ type, message, id: Date.now() })
  }, [])

  const refresh = useCallback(
    async ({ spinner = false } = {}) => {
      if (spinner) setRefreshing(true)
      try {
        const [linkData, statsData] = await Promise.all([api('/api/links'), api('/api/stats')])
        setLinks(linkData)
        setStats(statsData)
      } catch (err) {
        showToast('error', err.message)
      } finally {
        if (spinner) setRefreshing(false)
      }
    },
    [showToast],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh().finally(() => setInitialLoadDone(true))
    }, 0)
    return () => clearTimeout(timer)
  }, [refresh])

  useEffect(() => {
    if (introDone) return
    const timer = setTimeout(() => setIntroLeaving(true), 1500)
    return () => clearTimeout(timer)
  }, [introDone])

  useEffect(() => {
    if (!initialLoadDone || introDone) return
    const timer = setTimeout(() => setIntroLeaving(true), 650)
    return () => clearTimeout(timer)
  }, [initialLoadDone, introDone])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!pendingDelete) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !deleting) setPendingDelete(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingDelete, deleting])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      event.preventDefault()
      document.getElementById('url')?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    try {
      const payload = { url: url.trim() }
      if (alias.trim()) payload.alias = alias.trim()
      if (expiresInDays) payload.expires_in_days = Number(expiresInDays)

      const link = await api('/api/links', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setCreated(link)
      setUrl('')
      setAlias('')
      setExpiresInDays('')
      await refresh()
      showToast('success', 'Short link created.')
    } catch (err) {
      showToast('error', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy(value, key) {
    try {
      await copyText(value)
      setCopied(key)
      showToast('success', 'Copied to clipboard.')
      setTimeout(() => setCopied(null), 1600)
    } catch {
      showToast('error', 'Could not copy to clipboard')
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await api(`/api/links/${pendingDelete.code}`, { method: 'DELETE' })
      if (created?.code === pendingDelete.code) setCreated(null)
      setPendingDelete(null)
      await refresh()
      showToast('success', 'Link deleted.')
    } catch (err) {
      showToast('error', err.message)
    } finally {
      setDeleting(false)
    }
  }

  const host = typeof window !== 'undefined' ? window.location.host : ''
  const previewUrl = `${host || 'shawty.link'}/${alias.trim() || 'your-link'}`

  const visibleLinks = links.filter((link) => {
    const term = query.trim().toLowerCase()
    const matchesQuery =
      !term ||
      link.code.toLowerCase().includes(term) ||
      link.original_url.toLowerCase().includes(term)
    const matchesFilter =
      filter === 'all' ||
      (filter === 'custom' && link.is_custom) ||
      (filter === 'expired' && link.is_expired)
    return matchesQuery && matchesFilter
  })

  return (
    <div className="relative min-h-screen overflow-x-hidden text-ink">
      <Backdrop />
      {!introDone && <BreezeIntro leaving={introLeaving} onDone={() => setIntroDone(true)} />}
      <Header introDone={introDone} />

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <section className="animate-rise pt-8 sm:pt-10">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-ink/50">
                <span aria-hidden="true" className="h-2 w-2 border border-ink bg-vermilion" />
                URL shortener
              </p>
              <h1 className="mt-3 font-display text-4xl font-bold leading-[1.02] tracking-[-0.035em] sm:text-5xl">
                Shorten a link<span className="text-vermilion">.</span>
              </h1>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-ink/55">
              Paste a long URL. Pick a short alias. Share it.
            </p>
          </div>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_0.9fr] lg:items-start">
          <section id="shorten" className="scroll-mt-24">
            <Card className="animate-rise overflow-hidden [animation-delay:80ms]">
              <div className="flex h-2 border-b-2 border-ink" aria-hidden="true">
                <span className="flex-1 bg-vermilion" />
                <span className="flex-1 bg-saffron" />
                <span className="flex-1 bg-cobalt" />
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg font-bold">New link</h2>
                    <p className="mt-0.5 text-xs text-ink/50">
                      Paste a URL and get a short link back.
                    </p>
                  </div>
                  <span className="hidden items-center gap-1.5 border-2 border-ink bg-paper px-2 py-1 font-mono text-[10px] text-ink/55 shadow-hard-xs sm:inline-flex">
                    <kbd className="font-sans font-bold text-ink">/</kbd> focus
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label
                      htmlFor="url"
                      className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-ink/55"
                    >
                      <span>Destination URL</span>
                      <span className="font-mono text-[9px] font-normal tracking-normal text-ink/35">
                        required
                      </span>
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="relative min-w-0 flex-1">
                        <LinkIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                        <Input
                          id="url"
                          type="url"
                          required
                          autoComplete="off"
                          spellCheck="false"
                          placeholder="https://example.com/a/very/long/path"
                          value={url}
                          onChange={(event) => setUrl(event.target.value)}
                          className="h-12 pl-10"
                        />
                      </div>
                      <Button type="submit" size="lg" className="h-12 shrink-0" disabled={loading}>
                        {loading ? (
                          <>
                            <Spinner className="h-4 w-4" />
                            Shortening
                          </>
                        ) : (
                          <>
                            Shorten
                            <ArrowRightIcon className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="alias"
                        className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-ink/55"
                      >
                        <span>Custom alias</span>
                        <span className="font-mono text-[9px] font-normal tracking-normal text-ink/35">
                          optional
                        </span>
                      </label>
                      <Input
                        id="alias"
                        type="text"
                        autoComplete="off"
                        spellCheck="false"
                        placeholder="launch"
                        value={alias}
                        onChange={(event) => setAlias(event.target.value)}
                        className="font-mono"
                      />
                      <p className="mt-1 text-[10px] text-ink/40">
                        3–32 characters: a–z, 0–9, - or _
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="expires"
                        className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-ink/55"
                      >
                        <span>Expires in</span>
                        <span className="font-mono text-[9px] font-normal tracking-normal text-ink/35">
                          optional
                        </span>
                      </label>
                      <div className="relative">
                        <Input
                          id="expires"
                          type="number"
                          min="1"
                          max="365"
                          placeholder="30"
                          value={expiresInDays}
                          onChange={(event) => setExpiresInDays(event.target.value)}
                          className="pr-14"
                        />
                        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-wider text-ink/40">
                          days
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-ink/40">Leave blank to keep it forever</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-2 border-ink bg-paper px-3 py-2.5 shadow-hard-xs">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-2.5 w-2.5 shrink-0 border border-ink',
                        alias.trim() ? 'bg-vermilion' : 'bg-ink/15',
                      )}
                    />
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink/45">
                      Preview
                    </span>
                    <span
                      className="ml-auto min-w-0 truncate font-mono text-[11px] text-ink"
                      title={previewUrl}
                    >
                      {previewUrl}
                    </span>
                  </div>
                </form>
              </div>
            </Card>

            {created && <ResultCard created={created} copied={copied} onCopy={handleCopy} />}
          </section>

          <StatsPanel stats={stats} />
        </div>

        <section id="links" className="mt-10 scroll-mt-24">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-2xl font-bold tracking-tight">Your links</h2>
              <span className="inline-flex h-6 min-w-6 items-center justify-center border-2 border-ink bg-saffron px-1.5 font-mono text-[10px] font-bold shadow-hard-xs">
                {links.length}
              </span>
            </div>
            <p className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-ink/40 sm:block">
              {visibleLinks.length} shown · this browser
            </p>
          </div>

          <Card className="animate-rise overflow-hidden [animation-delay:160ms]">
            <div className="flex flex-col gap-3 border-b-2 border-ink bg-cream p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <div className="relative min-w-0 flex-1 lg:w-56 lg:flex-none">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
                  <Input
                    type="search"
                    placeholder="Search links"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-9 pl-9 text-xs"
                    aria-label="Search links"
                  />
                </div>
                <IconButton
                  label="Refresh links"
                  onClick={() => refresh({ spinner: true })}
                  disabled={refreshing}
                  className="shrink-0"
                >
                  <RefreshIcon className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                </IconButton>
              </div>

              <div
                className="flex shrink-0 items-center gap-1 border-2 border-ink bg-paper p-0.5 shadow-hard-xs"
                role="group"
                aria-label="Filter links"
              >
                {filters.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    aria-pressed={filter === item.value}
                    className={cn(
                      'px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt',
                      filter === item.value
                        ? 'bg-ink text-paper'
                        : 'text-ink/50 hover:bg-cream hover:text-ink',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {links.length === 0 ? (
              <EmptyState />
            ) : visibleLinks.length === 0 ? (
              <EmptyState filtered />
            ) : (
              <ul className="divide-y-2 divide-ink/10">
                {visibleLinks.map((link, index) => (
                  <LinkRow
                    key={link.code}
                    link={link}
                    index={index}
                    copied={copied}
                    onCopy={handleCopy}
                    onDelete={setPendingDelete}
                  />
                ))}
              </ul>
            )}
          </Card>
        </section>

        <footer className="mt-12 border-t-2 border-ink/15 py-6">
          <div className="flex flex-col items-start justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2 w-2 border border-ink bg-vermilion" />
              <span aria-hidden="true" className="h-2 w-2 border border-ink bg-saffron" />
              <span aria-hidden="true" className="h-2 w-2 border border-ink bg-cobalt" />
              <span className="ml-1">shawty — links, shortened</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-ink"
              >
                API docs
              </a>
              <span className="normal-case tracking-normal text-ink/35">
                {host || API_BASE || 'shawty'}
              </span>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 sm:justify-end">
            <span aria-hidden="true" className="h-px flex-1 bg-ink/15 sm:hidden" />
            <CreditBadge observe />
          </div>
        </footer>
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
      <DeleteDialog
        link={pendingDelete}
        deleting={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
