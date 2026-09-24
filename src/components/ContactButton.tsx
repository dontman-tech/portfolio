type ContactButtonProps = {
  className?: string
  onClick?: () => void
}

const GRADIENT =
  'linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)'

export default function ContactButton({ className = '', onClick }: ContactButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center justify-center rounded-full font-medium uppercase tracking-wide text-white transition-transform duration-300 hover:scale-[1.04] active:scale-[0.98] ${className}`}
      style={{
        background: GRADIENT,
        padding: '0.9rem 2.1rem',
        fontSize: 'clamp(0.75rem, 1.1vw, 1rem)',
        boxShadow:
          'inset 0 2px 6px rgba(255,255,255,0.35), inset 0 -6px 14px rgba(0,0,0,0.45), 0 8px 28px rgba(182,0,168,0.35)',
        outline: '2px solid rgba(255,255,255,0.55)',
        outlineOffset: '3px',
      }}
    >
      Contact Me
    </button>
  )
}
