import { motion } from 'framer-motion'
import type { ComponentType } from 'react'
import AnimatedText from '../components/AnimatedText'
import ContactButton from '../components/ContactButton'
import {
  MoonGraphic,
  LegoGraphic,
  ObjectGraphic,
  GroupGraphic,
} from '../components/CornerGraphics'

const ABOUT_COPY =
  "I am a Computer Engineering student at the University of Buea and a full-stack & applied AI engineer who ships complete products end to end. With experience spanning Python, TypeScript, React, Next.js, Flutter, and on-device voice/vision pipelines, I specialise in turning ideas into production-ready MVPs under tight deadlines. I care deeply about graceful degradation, offline-first paths, and interfaces a first-time user understands without a manual. Let's build something incredible together!"

type CornerProps = {
  Graphic: ComponentType<{ className?: string }>
  className: string
  delay: number
}

function CornerGraphic({ Graphic, className, delay }: CornerProps) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      className={`pointer-events-none absolute select-none ${className}`}
    >
      <Graphic className="h-full w-full" />
    </motion.div>
  )
}

export default function AboutSection() {
  const goToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="about"
      className="relative flex min-h-screen flex-col items-center justify-center px-5 py-20 sm:px-8 md:px-10"
      style={{ overflowX: 'clip' }}
    >
      <CornerGraphic
        Graphic={MoonGraphic}
        delay={0}
        className="left-3 top-6 h-[90px] w-[90px] sm:left-6 sm:top-10 sm:h-[130px] sm:w-[130px] md:h-[170px] md:w-[170px]"
      />
      <CornerGraphic
        Graphic={LegoGraphic}
        delay={0.1}
        className="right-3 top-6 h-[90px] w-[90px] sm:right-6 sm:top-10 sm:h-[130px] sm:w-[130px] md:h-[170px] md:w-[170px]"
      />
      <CornerGraphic
        Graphic={ObjectGraphic}
        delay={0.2}
        className="bottom-6 left-3 h-[90px] w-[90px] sm:bottom-10 sm:left-6 sm:h-[130px] sm:w-[130px] md:h-[170px] md:w-[170px]"
      />
      <CornerGraphic
        Graphic={GroupGraphic}
        delay={0.3}
        className="bottom-6 right-3 h-[90px] w-[90px] sm:bottom-10 sm:right-6 sm:h-[130px] sm:w-[130px] md:h-[170px] md:w-[170px]"
      />

      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="hero-heading text-center font-black uppercase leading-none tracking-tight"
        style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
      >
        About me
      </motion.h2>

      <div className="mt-10 w-full max-w-5xl sm:mt-14">
        <AnimatedText
          text={ABOUT_COPY}
          className="text-center font-light leading-relaxed text-[#D7E2EA]"
          style={{ fontSize: 'clamp(1rem, 2.1vw, 1.9rem)' }}
        />

        <div className="mt-10 flex justify-center sm:mt-14">
          <ContactButton onClick={goToContact} />
        </div>
      </div>
    </section>
  )
}
