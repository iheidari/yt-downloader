// The finalized Tubekeep identity: a "bracket-play B" mark (rounded square with
// two corner brackets framing an accent play triangle) plus the "tube·keep"
// wordmark, accent on "keep". Colors reference the Ink CSS-var palette so the
// mark inverts in dark mode (fill flips) and follows the live --pop accent.
const FILL = 'rgb(var(--fill))'
const ON_FILL = 'rgb(var(--on-fill))'
const POP = 'rgb(var(--pop))'

// The mark on its own — used for the favicon-scale icon and app-icon contexts.
export function LogoMark({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Tubekeep"
    >
      <rect width="32" height="32" rx="9" fill={FILL} />
      <path
        d="M8.5 12.5 L8.5 8.5 L12.5 8.5"
        fill="none"
        stroke={ON_FILL}
        strokeWidth="2.4"
        strokeLinecap="square"
      />
      <path
        d="M23.5 19.5 L23.5 23.5 L19.5 23.5"
        fill="none"
        stroke={ON_FILL}
        strokeWidth="2.4"
        strokeLinecap="square"
      />
      <path d="M14 12 L21 16 L14 20 Z" fill={POP} />
    </svg>
  )
}

// The lockup: mark + wordmark. `mark` sets the icon px; `word` sets the wordmark
// font-size in px. Defaults suit the app header.
function Logo({ mark = 30, word = 19, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-[11px] ${className}`}>
      <LogoMark size={mark} className="shrink-0" />
      <span
        className="font-bold tracking-tight text-ink leading-none"
        style={{ fontSize: `${word}px` }}
      >
        tube<span className="text-pop">keep</span>
      </span>
    </span>
  )
}

export default Logo
