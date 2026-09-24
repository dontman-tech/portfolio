import { motion } from 'framer-motion'
import { Github, Linkedin, Mail, MapPin, Phone } from 'lucide-react'
import ContactButton from '../components/ContactButton'

const DETAILS = [
  { icon: MapPin, label: 'Location', value: 'Buea, Cameroon', href: null },
  { icon: Mail, label: 'Email', value: 'tabe7143@gmail.com', href: 'mailto:tabe7143@gmail.com' },
  {
    icon: Phone,
    label: 'Phone / WhatsApp',
    value: '(+237) 680-553-744',
    href: 'tel:+237680553744',
  },
  {
    icon: Github,
    label: 'GitHub',
    value: 'github.com/dontman-tech',
    href: 'https://github.com/dontman-tech',
  },
  {
    icon: Linkedin,
    label: 'LinkedIn',
    value: 'linkedin.com/in/tabe-miracle-fiagmenyi',
    href: 'https://linkedin.com/in/tabe-miracle-fiagmenyi',
  },
]

export default function ContactSection() {
  return (
    <section
      id="contact"
      className="flex min-h-screen flex-col items-center justify-center bg-[#0C0C0C] px-5 py-20 sm:px-8 md:px-10"
      style={{ overflowX: 'clip' }}
    >
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="hero-heading text-center font-black uppercase leading-none tracking-tight"
        style={{ fontSize: 'clamp(2.5rem, 10vw, 140px)' }}
      >
        Let&apos;s Work Together
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className="mt-6 max-w-2xl text-center text-sm font-light uppercase tracking-wide text-[#D7E2EA]/70 sm:text-base"
      >
        a full-stack &amp; applied ai engineer shipping complete products end to end
      </motion.p>

      <div className="mt-12 flex justify-center">
        <ContactButton
          onClick={() => {
            window.location.href = 'mailto:tabe7143@gmail.com'
          }}
        />
      </div>

      <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
        {DETAILS.map((detail, index) => {
          const Icon = detail.icon
          const content = (
            <>
              <Icon className="h-5 w-5 shrink-0 text-[#D7E2EA]/70" aria-hidden="true" />
              <span className="flex flex-col gap-1">
                <span className="text-[0.65rem] uppercase tracking-[0.25em] text-[#D7E2EA]/45">
                  {detail.label}
                </span>
                <span className="break-all text-sm text-[#D7E2EA] sm:text-base">
                  {detail.value}
                </span>
              </span>
            </>
          )

          const base =
            'flex items-start gap-4 rounded-2xl border border-[#D7E2EA]/15 bg-[#141414] p-5 transition-colors duration-200'

          return (
            <motion.div
              key={detail.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 }}
            >
              {detail.href ? (
                <a
                  href={detail.href}
                  target={detail.href.startsWith('http') ? '_blank' : undefined}
                  rel={detail.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className={`${base} hover:border-[#D7E2EA]/40 hover:bg-[#1b1b1b]`}
                >
                  {content}
                </a>
              ) : (
                <div className={base}>{content}</div>
              )}
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
