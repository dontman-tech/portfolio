import { motion } from 'framer-motion'
import LiveProjectButton from '../components/LiveProjectButton'

const GITHUB = 'https://github.com/dontman-tech'

type Project = {
  index: number
  title: string
  stack: string
  category: string
  description: string
}

const PROJECTS: Project[] = [
  {
    index: 1,
    title: 'ARIA Voice AI Assistant',
    stack: 'Python · Kotlin · Flask · PWA',
    category: 'Applied AI / Voice Assistant',
    description:
      'Voice-first assistant featuring a modular skill router, long-term memory, offline deterministic fallbacks, and an Android bridge server controlling device Wi-Fi, flashlight, alarms, and screenshots.',
  },
  {
    index: 2,
    title: 'Re-kollect — Waste Collection Marketplace',
    stack: 'Flutter · Dart · Firebase · OSM',
    category: 'Mobile App / Marketplace — 3rd Place Orange Code for Change Hackathon',
    description:
      'Two-sided marketplace connecting waste generators to independent collectors with role-based auth, Firestore lifecycle, map pinning with Nominatim geocoding, and FCM fan-out.',
  },
  {
    index: 3,
    title: 'Lumina AI-Driven Platform',
    stack: 'JavaScript · Supabase · DeepSeek API',
    category: 'Applied AI Platform — 4th Place Finalist Prometheus AI Hackathon',
    description:
      'AI-driven platform connecting Supabase and DeepSeek API to process dynamic user requests under tight 15-hour hackathon constraints.',
  },
  {
    index: 4,
    title: 'Air Canvas Gesture Drawing',
    stack: 'Python · MediaPipe · OpenCV',
    category: 'Computer Vision / Gesture Control',
    description:
      'Air-drawing application with a five-gesture mode machine (draw, hover, erase, palette, clear) tuned for real-time webcam finger and pinch tracking.',
  },
  {
    index: 5,
    title: 'NESAC Password Strength Checker',
    stack: 'Python · Flask · JavaScript',
    category: 'Web Security / Utility',
    description:
      'Security tool that scores password resilience, explains vulnerabilities in plain language, and generates secure passphrases.',
  },
  {
    index: 6,
    title: 'Pulse Fit — Cross-Platform Fitness Tracker',
    stack: 'React Native · Expo · HealthKit',
    category: 'Mobile App / Health',
    description:
      'Fitness application with custom workout plans, animated progress rings, bidirectional Apple HealthKit/Google Fit sync, and simulated data fallbacks.',
  },
]

export default function ProjectsSection() {
  return (
    <section
      id="projects"
      className="relative z-10 -mt-10 rounded-t-[40px] bg-[#0C0C0C] px-5 py-20 sm:-mt-12 sm:rounded-t-[50px] sm:px-8 md:-mt-14 md:rounded-t-[60px] md:px-10"
      style={{ overflowX: 'clip' }}
    >
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="hero-heading text-center font-black uppercase leading-none tracking-tight"
        style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
      >
        Projects
      </motion.h2>

      <div className="mx-auto mt-16 w-full max-w-5xl sm:mt-20">
        {PROJECTS.map((project) => (
          <div
            key={project.title}
            className="sticky mb-8"
            style={{ top: `${72 + project.index * 14}px`, zIndex: project.index }}
          >
            <motion.article
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-h-[58vh] flex-col justify-between rounded-3xl border border-[#D7E2EA]/20 bg-[#141414] p-7 shadow-[0_-12px_40px_rgba(0,0,0,0.55)] sm:p-10 md:min-h-[62vh]"
            >
              <div className="flex items-start justify-between gap-6">
                <span className="text-6xl font-black leading-none text-[#D7E2EA]/15 sm:text-7xl md:text-8xl">
                  {String(project.index).padStart(2, '0')}
                </span>
                <span className="max-w-[60%] text-right text-[0.65rem] uppercase tracking-[0.2em] text-[#D7E2EA]/60 sm:text-xs">
                  {project.category}
                </span>
              </div>

              <div className="mt-10">
                <h3 className="text-2xl font-bold uppercase leading-tight tracking-tight text-[#D7E2EA] sm:text-3xl md:text-5xl">
                  {project.title}
                </h3>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#D7E2EA]/60 sm:text-sm">
                  {project.stack}
                </p>
                <p className="mt-5 max-w-3xl text-sm font-light leading-relaxed text-[#D7E2EA]/80 sm:text-base md:text-lg">
                  {project.description}
                </p>
              </div>

              <div className="mt-8">
                <LiveProjectButton href={GITHUB} />
              </div>
            </motion.article>
          </div>
        ))}
      </div>
    </section>
  )
}
