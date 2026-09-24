import { ArrowUpRight } from 'lucide-react'

type LiveProjectButtonProps = {
  href: string
  label?: string
  className?: string
}

export default function LiveProjectButton({
  href,
  label = 'View on GitHub',
  className = '',
}: LiveProjectButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full border border-[#D7E2EA]/40 px-5 py-2 text-xs uppercase tracking-widest text-[#D7E2EA] transition-colors duration-200 hover:bg-[#D7E2EA]/10 sm:text-sm ${className}`}
    >
      {label}
      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
    </a>
  )
}
