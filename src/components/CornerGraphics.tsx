type GraphicProps = { className?: string }

const STROKE = '#BBCCD7'

/** Decorative corner graphics for the About section. Self-contained so they
 *  never depend on an external asset host. */

export function MoonGraphic({ className = '' }: GraphicProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="moon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#646973" />
          <stop offset="100%" stopColor="#BBCCD7" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="34" fill="url(#moon)" />
      <circle cx="50" cy="50" r="46" fill="none" stroke={STROKE} strokeOpacity="0.25" />
      <circle cx="38" cy="40" r="6" fill="#0C0C0C" fillOpacity="0.18" />
      <circle cx="60" cy="58" r="8" fill="#0C0C0C" fillOpacity="0.15" />
      <circle cx="58" cy="34" r="4" fill="#0C0C0C" fillOpacity="0.12" />
    </svg>
  )
}

export function LegoGraphic({ className = '' }: GraphicProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="brick" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BBCCD7" />
          <stop offset="100%" stopColor="#646973" />
        </linearGradient>
      </defs>
      <rect x="20" y="42" width="60" height="34" rx="4" fill="url(#brick)" />
      <rect x="28" y="30" width="16" height="12" rx="3" fill={STROKE} fillOpacity="0.75" />
      <rect x="56" y="30" width="16" height="12" rx="3" fill={STROKE} fillOpacity="0.75" />
      <rect x="20" y="42" width="60" height="34" rx="4" fill="none" stroke={STROKE} strokeOpacity="0.4" />
    </svg>
  )
}

export function ObjectGraphic({ className = '' }: GraphicProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cube" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#BBCCD7" />
          <stop offset="100%" stopColor="#646973" />
        </linearGradient>
      </defs>
      <path d="M50 16 82 34 50 52 18 34Z" fill="url(#cube)" />
      <path d="M18 34 50 52 50 86 18 68Z" fill={STROKE} fillOpacity="0.35" />
      <path d="M82 34 50 52 50 86 82 68Z" fill={STROKE} fillOpacity="0.55" />
      <path
        d="M50 16 82 34 50 52 18 34Zm0 36v34M82 34 50 52 18 34"
        fill="none"
        stroke={STROKE}
        strokeOpacity="0.5"
      />
    </svg>
  )
}

export function GroupGraphic({ className = '' }: GraphicProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="group" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#BBCCD7" />
          <stop offset="100%" stopColor="#646973" />
        </linearGradient>
      </defs>
      <circle cx="34" cy="36" r="16" fill="url(#group)" />
      <circle cx="66" cy="46" r="12" fill={STROKE} fillOpacity="0.5" />
      <circle cx="46" cy="70" r="10" fill={STROKE} fillOpacity="0.35" />
      <circle cx="34" cy="36" r="16" fill="none" stroke={STROKE} strokeOpacity="0.6" />
      <circle cx="66" cy="46" r="12" fill="none" stroke={STROKE} strokeOpacity="0.4" />
    </svg>
  )
}
