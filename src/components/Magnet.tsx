import { useEffect, useRef, useState, type ReactNode } from 'react'

type MagnetProps = {
  children: ReactNode
  padding?: number
  strength?: number
  activeTransition?: string
  inactiveTransition?: string
  className?: string
  wrapperClassName?: string
}

/**
 * Tracks the pointer while it is within `padding` of the element's centre and
 * offsets the child toward it. The offset is released once the pointer leaves.
 */
export default function Magnet({
  children,
  padding = 100,
  strength = 2,
  activeTransition = 'transform 0.3s ease-out',
  inactiveTransition = 'transform 0.6s ease-in-out',
  className = '',
  wrapperClassName = '',
}: MagnetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const node = ref.current
      if (!node) return

      const rect = node.getBoundingClientRect()
      const centreX = rect.left + rect.width / 2
      const centreY = rect.top + rect.height / 2
      const deltaX = event.clientX - centreX
      const deltaY = event.clientY - centreY

      const withinX = Math.abs(deltaX) < rect.width / 2 + padding
      const withinY = Math.abs(deltaY) < rect.height / 2 + padding

      if (withinX && withinY) {
        setActive(true)
        setOffset({ x: deltaX / strength, y: deltaY / strength })
      } else {
        setActive(false)
        setOffset({ x: 0, y: 0 })
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    return () => window.removeEventListener('pointermove', onPointerMove)
  }, [padding, strength])

  return (
    <div ref={ref} className={wrapperClassName}>
      <div
        className={className}
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          transition: active ? activeTransition : inactiveTransition,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
}
