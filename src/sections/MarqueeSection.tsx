import { useEffect, useRef, useState } from 'react'

type TechItem = { name: string; tag: string }

const ROW_ONE: TechItem[] = [
  { name: 'Python', tag: 'Language' },
  { name: 'TypeScript', tag: 'Language' },
  { name: 'React 19', tag: 'Frontend' },
  { name: 'Next.js 16', tag: 'Framework' },
  { name: 'React Native', tag: 'Mobile' },
  { name: 'Expo', tag: 'Mobile' },
  { name: 'Tailwind 4', tag: 'Styling' },
  { name: 'Node.js', tag: 'Runtime' },
  { name: 'Flask', tag: 'Backend' },
  { name: 'FastAPI', tag: 'Backend' },
  { name: 'Supabase', tag: 'Backend' },
]

const ROW_TWO: TechItem[] = [
  { name: 'Firebase', tag: 'Backend' },
  { name: 'Flutter', tag: 'Mobile' },
  { name: 'Dart', tag: 'Language' },
  { name: 'OpenCV', tag: 'Computer Vision' },
  { name: 'MediaPipe', tag: 'Computer Vision' },
  { name: 'DeepSeek API', tag: 'AI' },
  { name: 'Docker', tag: 'DevOps' },
  { name: 'Git', tag: 'Tooling' },
  { name: 'REST APIs', tag: 'Integration' },
  { name: 'SQLite', tag: 'Database' },
  { name: 'HealthKit', tag: 'Mobile' },
]

const TRIPLED_ONE = [...ROW_ONE, ...ROW_ONE, ...ROW_ONE]
const TRIPLED_TWO = [...ROW_TWO, ...ROW_TWO, ...ROW_TWO]

function Tile({ item }: { item: TechItem }) {
  return (
    <div
      className="flex h-[270px] w-[420px] shrink-0 flex-col justify-between rounded-2xl border border-[#D7E2EA]/20 bg-[#141414] p-8"
      style={{ gap: '0.75rem' }}
    >
      <span
        className="text-4xl font-semibold uppercase tracking-tight text-[#D7E2EA]"
        style={{ textShadow: '0 0 24px rgba(187,204,215,0.45)' }}
      >
        {item.name}
      </span>
      <span className="w-fit rounded-full border border-[#D7E2EA]/25 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#D7E2EA]/60">
        {item.tag}
      </span>
    </div>
  )
}

function Row({ items, x }: { items: TechItem[]; x: number }) {
  return (
    <div className="overflow-hidden">
      {/* -33.333% of the tripled width == one full set, so the loop stays
          seamless whichever direction the row drifts. */}
      <div
        className="flex w-max"
        style={{
          gap: '0.75rem',
          transform: `translate3d(calc(${x}px - 33.333%), 0, 0)`,
          willChange: 'transform',
        }}
      >
        {items.map((item, index) => (
          <Tile key={`${item.name}-${index}`} item={item} />
        ))}
      </div>
    </div>
  )
}

export default function MarqueeSection() {
  const ref = useRef<HTMLElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    let frame = 0
    const update = () => {
      const node = ref.current
      if (!node) return
      const sectionTop = node.offsetTop
      setOffset((window.scrollY - sectionTop + window.innerHeight) * 0.3)
    }
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <section
      ref={ref}
      className="bg-[#0C0C0C] pb-10 pt-24 sm:pt-32 md:pt-40"
      style={{ overflowX: 'clip' }}
      aria-label="Technology stack"
    >
      <div className="flex flex-col" style={{ gap: '0.75rem' }}>
        <Row items={TRIPLED_ONE} x={offset - 200} />
        <Row items={TRIPLED_TWO} x={-(offset - 200)} />
      </div>
    </section>
  )
}
