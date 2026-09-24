import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { useRef } from 'react'

type AnimatedTextProps = {
  text: string
  className?: string
  style?: React.CSSProperties
}

function Character({
  char,
  progress,
  range,
}: {
  char: string
  progress: MotionValue<number>
  range: [number, number]
}) {
  const opacity = useTransform(progress, range, [0.2, 1])
  return (
    <motion.span style={{ opacity }} className="inline-block whitespace-pre">
      {char}
    </motion.span>
  )
}

/**
 * Scroll-driven, character-by-character reveal. Each character fades from 0.2
 * to 1 as the block travels through the middle of the viewport.
 */
export default function AnimatedText({ text, className = '', style }: AnimatedTextProps) {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'start 0.25'],
  })

  const characters = text.split('')
  const step = 1 / characters.length

  return (
    <p ref={ref} className={className} style={style}>
      {characters.map((char, index) => (
        <Character
          key={`${char}-${index}`}
          char={char}
          progress={scrollYProgress}
          range={[index * step, index * step + step]}
        />
      ))}
    </p>
  )
}
