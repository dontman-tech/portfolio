import { motion } from 'framer-motion'

type Service = { number: string; title: string; body: string }

const SERVICES: Service[] = [
  {
    number: '01',
    title: 'Full-Stack Web & Mobile Development',
    body: 'Building responsive frontends with React 19, Next.js 16, and Tailwind 4, alongside cross-platform mobile applications using React Native, Expo, and Flutter.',
  },
  {
    number: '02',
    title: 'Applied AI & Computer Vision Integration',
    body: 'Architecting voice/vision pipelines, prompt engineering, and integrating DeepSeek API, OpenAI, Claude, MediaPipe, and OpenCV into production systems.',
  },
  {
    number: '03',
    title: 'Backend & API Engineering',
    body: 'Designing robust server-side logic, custom APIs, and microservices using Python (Flask, FastAPI), Node.js, Supabase, and Firebase (Auth/Firestore/FCM).',
  },
  {
    number: '04',
    title: 'Resilient & Offline-First System Design',
    body: 'Engineering applications with graceful degradation, offline-first fallback modes, and native Android bridges for hardware interaction.',
  },
  {
    number: '05',
    title: 'Rapid MVP Development & Prototyping',
    body: 'Taking ideas from a blank repository to fully functional MVPs under tight timelines, backed by hackathon award-winning execution.',
  },
]

export default function ServicesSection() {
  return (
    <section
      id="services"
      className="rounded-t-[40px] bg-[#FFFFFF] px-5 py-20 sm:rounded-t-[50px] sm:px-8 sm:py-24 md:rounded-t-[60px] md:px-10 md:py-32"
      style={{ overflowX: 'clip' }}
    >
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-center font-black uppercase leading-none tracking-tight text-[#0C0C0C]"
        style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
      >
        Services
      </motion.h2>

      <div className="mx-auto mt-16 w-full max-w-6xl sm:mt-20">
        {SERVICES.map((service, index) => (
          <motion.div
            key={service.number}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
            className="flex flex-col gap-4 border-t border-[#0C0C0C]/15 py-8 md:flex-row md:items-start md:gap-12 md:py-12"
          >
            <span className="text-2xl font-black text-[#0C0C0C]/30 md:w-24 md:text-3xl">
              {service.number}
            </span>
            <div className="md:flex-1">
              <h3 className="text-xl font-semibold uppercase tracking-wide text-[#0C0C0C] sm:text-2xl md:text-3xl">
                {service.title}
              </h3>
              <p className="mt-3 max-w-3xl text-sm font-light leading-relaxed text-[#0C0C0C]/70 sm:text-base md:text-lg">
                {service.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
