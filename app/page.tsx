'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  motion,
  AnimatePresence,
  useInView,
  useMotionValue,
  animate as motionAnimate,
} from 'framer-motion'
import {
  UploadCloud,
  FileCog,
  Boxes,
  Calculator,
  Truck,
  CheckCircle2,
  Star,
  ArrowRight,
  ShieldCheck,
  HardDrive,
  Sparkles,
  Eye,
  BadgeCheck,
  AlertCircle,
  Clock,
  Menu,
  X,
} from 'lucide-react'

import { easeOut } from '@/app/configure/components/motion'

const ACCEPTED_FILE_TYPES = ['step', 'stp', 'iges', 'igs', 'dxf']
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function HomePage() {
  const router = useRouter()
  const [isDragActive, setIsDragActive] = useState(false)
  const [error, setError] = useState('')

  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    if (file.size > MAX_FILE_SIZE) {
      return { isValid: false, error: 'File size must be under 50MB' }
    }

    const extension = file.name.toLowerCase().split('.').pop()

    if (!extension || !ACCEPTED_FILE_TYPES.includes(extension)) {
      return {
        isValid: false,
        error: 'File must be in STEP (.step, .stp), IGES (.iges, .igs), or DXF (.dxf) format',
      }
    }

    return { isValid: true }
  }, [])

  const handleFileUpload = useCallback(
    (file: File) => {
      const validation = validateFile(file)

      if (!validation.isValid) {
        setError(validation.error || 'Invalid file')
        return
      }

      setError('')

      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      }
      sessionStorage.setItem('uploadedFile', JSON.stringify(fileData))

      const fileUrl = URL.createObjectURL(file)
      sessionStorage.setItem('uploadedFileUrl', fileUrl)

      router.push('/configure')
    },
    [validateFile, router]
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFileUpload(files[0])
      }
    },
    [handleFileUpload]
  )

  const handleFileSelect = useCallback(
    (event: Event) => {
      const input = event.target as HTMLInputElement | null
      const files = input?.files
      if (files && files.length > 0) {
        handleFileUpload(files[0])
      }
    },
    [handleFileUpload]
  )

  const handleUploadClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.step,.stp,.iges,.igs,.dxf'
    input.addEventListener('change', handleFileSelect, { once: true })
    input.click()
  }, [handleFileSelect])

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <Hero
        isDragActive={isDragActive}
        error={error}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onUploadClick={handleUploadClick}
      />
      <ProofSection />
      <HowItWorks />
      <WhyChoose />
      <MaterialsSection />
      <Testimonials />
      <CTASection onUpload={handleUploadClick} />
      <Footer />
    </div>
  )
}

/* ---------- Nav ---------- */

function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const linkClass = scrolled
    ? 'text-slate-600 hover:text-slate-900'
    : 'text-slate-300 hover:text-white'

  const buttonOnDark = !scrolled && !mobileOpen

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || mobileOpen
          ? 'border-b border-slate-200/80 bg-white/95 backdrop-blur-xl'
          : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md shadow-blue-500/30">
              <Boxes className="h-4 w-4 text-white" />
            </div>
            <span
              className={`text-lg font-bold tracking-tight ${
                scrolled || mobileOpen ? 'text-slate-900' : 'text-white'
              }`}
            >
              TubeBend
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className={`text-sm font-medium ${linkClass}`}>
              How it works
            </a>
            <a href="#materials" className={`text-sm font-medium ${linkClass}`}>
              Materials
            </a>
            <Link href="/contact" className={`text-sm font-medium ${linkClass}`}>
              Contact
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/auth/login" className={`text-sm font-medium ${linkClass}`}>
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-transform hover:scale-[1.02]"
              >
                Get started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-panel"
            onClick={() => setMobileOpen(v => !v)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500/40 md:hidden ${
              buttonOnDark
                ? 'text-white/90 hover:bg-white/10'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav-panel"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: easeOut }}
            className="border-t border-slate-200 bg-white md:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
              <a
                href="#how-it-works"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                How it works
              </a>
              <a
                href="#materials"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Materials
              </a>
              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Contact
              </Link>
              <div className="my-2 h-px bg-slate-200" />
              <Link
                href="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setMobileOpen(false)}
                className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 px-4 py-3 text-base font-semibold text-white shadow-md shadow-blue-500/25"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

/* ---------- Hero ---------- */

interface HeroProps {
  isDragActive: boolean
  error: string
  onDragEnter: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onUploadClick: () => void
}

function Hero({
  isDragActive,
  error,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onUploadClick,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 pt-16">
      {/* Glow accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-blue-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-cyan-400/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_60%)]"
      />

      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pb-32 sm:pt-20 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOut }}
          className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-blue-200/80"
        >
          <span className="inline-block h-px w-6 bg-blue-300/60" />
          Instant quoting for custom tube bending
          <span className="inline-block h-px w-6 bg-blue-300/60" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut, delay: 0.05 }}
          className="mx-auto mt-5 max-w-4xl text-center text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl"
        >
          Custom tube bending
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
            at the speed of CAD
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut, delay: 0.1 }}
          className="mx-auto mt-5 max-w-2xl text-center text-base text-slate-300 sm:text-lg"
        >
          Drop your STEP, IGES, or DXF — get transparent line-item pricing in under 30 seconds.
          No call sheets, no minimum orders, no surprises.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: easeOut, delay: 0.15 }}
          className="mx-auto mt-12 max-w-2xl"
        >
          <HeroDropzone
            isDragActive={isDragActive}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onUploadClick={onUploadClick}
          />

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200"
              >
                <AlertCircle className="h-4 w-4" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: easeOut, delay: 0.3 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400"
        >
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Instant pricing
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            No account required
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Browser-side parsing
          </span>
        </motion.div>
      </div>

      <HeroSeam />
    </section>
  )
}

/* Curved hero → white transition with horizon glow + accent line */
function HeroSeam() {
  return (
    <>
      {/* Cyan bloom rising from the seam — gives the dark scene a "lit horizon" */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-12 h-40 sm:bottom-16 sm:h-56"
        style={{
          background:
            'radial-gradient(ellipse 60% 100% at 50% 100%, rgba(34, 211, 238, 0.18), rgba(59, 130, 246, 0.08) 40%, transparent 70%)',
        }}
      />

      {/* Curved white fill — the "water level" */}
      <svg
        aria-hidden
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 w-full sm:h-16"
      >
        <path
          d="M0,80 C360,32 720,12 1080,32 C1260,42 1380,62 1440,80 L1440,80 L0,80 Z"
          fill="white"
        />
      </svg>

      {/* Hairline accent traced along the curve */}
      <svg
        aria-hidden
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-12 w-full sm:h-16"
      >
        <defs>
          <linearGradient id="hero-seam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(96, 165, 250, 0)" />
            <stop offset="35%" stopColor="rgba(96, 165, 250, 0.55)" />
            <stop offset="65%" stopColor="rgba(34, 211, 238, 0.55)" />
            <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
          </linearGradient>
        </defs>
        <path
          d="M0,80 C360,32 720,12 1080,32 C1260,42 1380,62 1440,80"
          fill="none"
          stroke="url(#hero-seam)"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </>
  )
}

/* ---------- Hero dropzone ---------- */

interface HeroDropzoneProps {
  isDragActive: boolean
  onDragEnter: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onUploadClick: () => void
}

function HeroDropzone({
  isDragActive,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onUploadClick,
}: HeroDropzoneProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onUploadClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onUploadClick()
      }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`group relative isolate cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed bg-white shadow-2xl shadow-blue-500/10 transition-colors duration-300 ${
        isDragActive ? 'border-blue-500' : 'border-slate-300/80 hover:border-blue-400'
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(226 232 240 / 0.7) 1px, transparent 1px), linear-gradient(to bottom, rgb(226 232 240 / 0.7) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      <motion.div
        aria-hidden
        animate={{ opacity: isDragActive ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/5 via-cyan-400/5 to-transparent"
      />

      <div className="px-6 py-12 sm:px-10 sm:py-14">
        <div className="relative mx-auto mb-6 h-20 w-20">
          <motion.div
            aria-hidden
            animate={{
              y: isDragActive ? -8 : [0, -5, 0],
              opacity: isDragActive ? 0.85 : [0.5, 0.7, 0.5],
            }}
            transition={{
              duration: isDragActive ? 0.3 : 3.5,
              repeat: isDragActive ? 0 : Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -left-3 top-2 flex h-9 w-9 -rotate-[8deg] items-center justify-center rounded-xl border border-slate-200 bg-white shadow-md shadow-slate-900/5"
          >
            <FileCog className="h-4 w-4 text-slate-400" />
          </motion.div>
          <motion.div
            aria-hidden
            animate={{
              y: isDragActive ? -6 : [0, -4, 0],
              opacity: isDragActive ? 0.9 : [0.55, 0.7, 0.55],
            }}
            transition={{
              duration: isDragActive ? 0.3 : 3,
              repeat: isDragActive ? 0 : Infinity,
              ease: 'easeInOut',
              delay: 0.4,
            }}
            className="absolute -right-3 top-3 flex h-9 w-9 rotate-[10deg] items-center justify-center rounded-xl border border-slate-200 bg-white shadow-md shadow-slate-900/5"
          >
            <Boxes className="h-4 w-4 text-slate-400" />
          </motion.div>

          <motion.div
            animate={{ scale: isDragActive ? 1.05 : 1, y: isDragActive ? -3 : 0 }}
            transition={{ duration: 0.25, ease: easeOut }}
            className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-xl shadow-blue-500/30"
          >
            <UploadCloud className="h-8 w-8" />
            <motion.span
              aria-hidden
              initial={{ opacity: 0.5, scale: 1 }}
              animate={{ opacity: 0, scale: 1.7 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-2xl ring-2 ring-blue-400/40"
            />
          </motion.div>
        </div>

        <div className="text-center">
          <motion.h3
            key={isDragActive ? 'drag' : 'idle'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-2xl font-semibold tracking-tight text-slate-900"
          >
            {isDragActive ? 'Release to upload' : 'Drop your CAD file to begin'}
          </motion.h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            We&apos;ll auto-detect length, bends and cuts in seconds — no signup required.{' '}
            <span className="whitespace-nowrap font-medium text-blue-600 underline-offset-4 group-hover:underline">
              Browse files
            </span>
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 text-xs">
            {['step', 'stp', 'iges', 'igs', 'dxf'].map(ext => (
              <span
                key={ext}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-[11px] tracking-wider text-slate-600 shadow-sm"
              >
                .{ext}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative border-t border-slate-200/70 bg-slate-50/60 px-6 py-3 sm:px-10">
        <div className="grid grid-cols-1 gap-2 text-[12px] text-slate-600 sm:grid-cols-3">
          <TrustItem icon={ShieldCheck} label="Browser-side parsing" />
          <TrustItem icon={HardDrive} label="Up to 50 MB" />
          <TrustItem icon={Boxes} label="STEP, IGES, DXF" />
        </div>
      </div>
    </div>
  )
}

function TrustItem({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
      <span className="truncate">{label}</span>
    </div>
  )
}

/* ---------- Section header ---------- */

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="mx-auto max-w-3xl text-center"
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">
        {eyebrow}
      </div>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">{subtitle}</p>
      )}
    </motion.div>
  )
}

/* ---------- Proof section ---------- */

function ProofSection() {
  return (
    <section className="relative bg-white pt-12 pb-20 sm:pt-16 sm:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="See before you pay"
          title="Preview your part. Read your invoice."
          subtitle="Two truths most quoting tools hide: what your bent tube actually looks like, and exactly what every line of the price is for."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <ProofPreviewCard />
          <ProofPricingCard />
        </div>

        <Stats />
      </div>
    </section>
  )
}

function ProofPreviewCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
            Step 1 — Preview
          </div>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            See your part before you order
          </h3>
        </div>
        <span className="hidden items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 sm:inline-flex">
          <Eye className="h-3 w-3" />
          Live 3D
        </span>
      </div>

      <div className="relative mt-5 aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 via-slate-50 to-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(203 213 225 / 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgb(203 213 225 / 0.5) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="tube-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <motion.path
            d="M 60 320 L 180 320 Q 240 320 240 260 L 240 140 Q 240 80 300 80 L 350 80"
            fill="none"
            stroke="url(#tube-grad)"
            strokeWidth="32"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.2 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 1.4, ease: easeOut }}
          />
          <motion.path
            d="M 60 320 L 180 320 Q 240 320 240 260 L 240 140 Q 240 80 300 80 L 350 80"
            fill="none"
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="6"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 1.4, ease: easeOut, delay: 0.05 }}
          />
        </svg>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, delay: 1.1 }}
          className="absolute right-3 top-3 rounded-md border border-slate-200 bg-white/80 px-2 py-1 font-mono text-[10px] text-slate-700 shadow-sm backdrop-blur"
        >
          R 1.5″ · 90°
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, delay: 1.25 }}
          className="absolute bottom-3 left-3 flex items-center gap-1 rounded-md border border-slate-200 bg-white/80 px-2 py-1 font-mono text-[10px] text-slate-700 shadow-sm backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span className="ml-0.5">XYZ</span>
        </motion.div>
      </div>

      <p className="mt-5 text-sm text-slate-600">
        Drag, rotate, zoom — the same in-browser viewer powers your final spec sheet so the part you see is the part you&apos;ll receive.
      </p>
    </motion.div>
  )
}

function ProofPricingCard() {
  const lines = [
    { label: 'Material (1″ steel tube)', value: 24.5 },
    { label: 'Bending (3 bends)', value: 18.0 },
    { label: 'Finishing', value: 12.0 },
  ]
  const total = lines.reduce((sum, l) => sum + l.value, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, ease: easeOut, delay: 0.08 }}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
            Step 2 — Pricing
          </div>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Transparent line-item pricing
          </h3>
        </div>
        <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:inline-flex">
          <Sparkles className="h-3 w-3" />
          No black box
        </span>
      </div>

      <div className="mt-5 space-y-1">
        {lines.map((line, i) => (
          <motion.div
            key={line.label}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.3, ease: easeOut, delay: 0.1 + i * 0.08 }}
            className="flex items-center justify-between border-b border-slate-100 py-3 text-sm"
          >
            <span className="text-slate-600">{line.label}</span>
            <span className="font-semibold tabular-nums text-slate-900">
              ${line.value.toFixed(2)}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 flex items-baseline justify-between rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-4 text-white">
        <span className="text-sm font-medium text-slate-300">Total per part</span>
        <CountUpCurrency
          to={total}
          className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-2xl font-semibold tabular-nums text-transparent"
        />
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
        <Clock className="h-3.5 w-3.5 text-slate-400" />
        Ready to ship in 3–5 days · Tracked from shop floor to your dock
      </div>
    </motion.div>
  )
}

/* ---------- Stats ---------- */

function Stats() {
  return (
    <motion.div
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-50px' }}
      variants={{ initial: {}, animate: { transition: { staggerChildren: 0.12 } } }}
      className="mt-12 grid gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:grid-cols-3 sm:p-10"
    >
      <StatCard label="Parts manufactured" value={1247} />
      <StatCard label="Ship-within promise" value={97} suffix="%" />
      <StatCard label="Customer rating" value={4.9} decimals={1} suffix="★" />
    </motion.div>
  )
}

function StatCard({
  label,
  value,
  suffix = '',
  decimals = 0,
}: {
  label: string
  value: number
  suffix?: string
  decimals?: number
}) {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
      }}
      className="text-center"
    >
      <div className="bg-gradient-to-br from-blue-600 to-cyan-500 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
        <CountUp to={value} suffix={suffix} decimals={decimals} />
      </div>
      <div className="mt-2 text-sm text-slate-600">{label}</div>
    </motion.div>
  )
}

function CountUp({
  to,
  suffix = '',
  decimals = 0,
  duration = 1.2,
}: {
  to: number
  suffix?: string
  decimals?: number
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const value = useMotionValue(0)
  const [text, setText] = useState(decimals > 0 ? (0).toFixed(decimals) : '0')

  useEffect(() => {
    if (!inView) return
    const controls = motionAnimate(value, to, {
      duration,
      ease: easeOut,
      onUpdate: latest => {
        if (decimals > 0) {
          setText(latest.toFixed(decimals))
        } else {
          setText(Math.floor(latest).toLocaleString())
        }
      },
    })
    return () => controls.stop()
  }, [inView, to, duration, decimals, value])

  return (
    <span ref={ref}>
      {text}
      {suffix}
    </span>
  )
}

function CountUpCurrency({ to, className }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const value = useMotionValue(0)
  const [text, setText] = useState('$0.00')

  useEffect(() => {
    if (!inView) return
    const controls = motionAnimate(value, to, {
      duration: 1.0,
      ease: easeOut,
      onUpdate: latest => setText(`$${latest.toFixed(2)}`),
    })
    return () => controls.stop()
  }, [inView, to, value])

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  )
}

/* ---------- How it works ---------- */

function HowItWorks() {
  const steps = [
    {
      icon: UploadCloud,
      title: 'Upload your CAD file',
      desc: 'STEP, IGES, or DXF — parsed in your browser. Length, bends, and cuts auto-detected.',
    },
    {
      icon: Calculator,
      title: 'Pick material & quantity',
      desc: 'Aluminum, stainless, or carbon steel. Choose gauge and quantity — quote updates live.',
    },
    {
      icon: Truck,
      title: 'We bend & ship',
      desc: 'Precision bent and shipped in 3–5 days. Tracked from shop floor to your dock.',
    },
  ]

  return (
    <section id="how-it-works" className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="How it works"
          title="From CAD file to finished part in three steps"
          subtitle="No phone calls. No engineering review queue. No five-business-day quote turnaround."
        />

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          variants={{ initial: {}, animate: { transition: { staggerChildren: 0.1 } } }}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              variants={{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
              }}
              whileHover={{ y: -3 }}
              className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:p-7"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/25">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Step {i + 1}
                </div>
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.desc}</p>

              {i < steps.length - 1 && (
                <div
                  aria-hidden
                  className="absolute -right-4 top-1/2 hidden -translate-y-1/2 md:block"
                >
                  <ArrowRight className="h-5 w-5 text-slate-300" />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ---------- Why choose ---------- */

function WhyChoose() {
  const features = [
    {
      icon: BadgeCheck,
      iconClass: 'text-blue-600 bg-blue-50',
      title: 'Tube bending specialists',
      desc:
        'Unlike Xometry or other platforms that do everything, we focus exclusively on tube bending. Better quality, faster turnaround.',
    },
    {
      icon: Eye,
      iconClass: 'text-emerald-600 bg-emerald-50',
      title: 'Transparent pricing',
      desc:
        "No black-box quotes. See exactly what you're paying for — material, bending, finishing — before you commit.",
    },
    {
      icon: Sparkles,
      iconClass: 'text-purple-600 bg-purple-50',
      title: 'No minimum orders',
      desc:
        'From garage makers to Fortune 500. Order one part or thousands — we treat every customer the same.',
    },
  ]

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Why TubeBend"
          title="A specialist beats a marketplace"
          subtitle="We're tube bending specialists, not a general manufacturing platform. That focus shows up in our quotes, our parts, and our turnaround."
        />

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          variants={{ initial: {}, animate: { transition: { staggerChildren: 0.1 } } }}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {features.map(f => (
            <motion.div
              key={f.title}
              variants={{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
              }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${f.iconClass}`}>
                <f.icon className="h-6 w-6" strokeWidth={2.2} />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ---------- Materials ---------- */

function MaterialsSection() {
  const materials = [
    { name: 'Carbon Steel', desc: 'Strong, durable, cost-effective.', color: '#696969', price: 1.85 },
    { name: 'Aluminum', desc: '6061-T6 lightweight & marine-grade.', color: '#C0C0C0', price: 2.5 },
    { name: 'Stainless Steel', desc: '304 & 316 corrosion-resistant.', color: '#E8E8E8', price: 4.75 },
    { name: 'Copper', desc: 'Pure copper for plumbing & art.', color: '#B87333', price: 5.2 },
  ]

  return (
    <section id="materials" className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Materials"
          title="Pick your metal"
          subtitle="Quoted live with up-to-date market pricing — no spreadsheets, no estimates."
        />

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          variants={{ initial: {}, animate: { transition: { staggerChildren: 0.08 } } }}
          className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {materials.map(m => (
            <motion.div
              key={m.name}
              variants={{
                initial: { opacity: 0, y: 16 },
                animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
              }}
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg"
            >
              <div
                className="mx-auto h-16 w-16 rounded-full shadow-inner ring-2 ring-white"
                style={{
                  background: `linear-gradient(135deg, ${m.color} 0%, #fff 200%)`,
                }}
              />
              <div className="mt-4 text-center">
                <h3 className="font-semibold tracking-tight text-slate-900">{m.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{m.desc}</p>
                <div className="mt-3 inline-flex items-baseline gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                  <span className="text-sm font-semibold text-slate-900">
                    ${m.price.toFixed(2)}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">/lb</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ---------- Testimonials ---------- */

function Testimonials() {
  const items = [
    {
      name: 'Mike Chen',
      company: 'Precision Fabrication',
      text:
        "TubeBend's transparent pricing saved us hours of back-and-forth quotes. Quality is consistently excellent.",
      rating: 5,
    },
    {
      name: 'Sarah Johnson',
      company: 'Custom Motorcycle Shop',
      text:
        "As a small shop, I love that there's no minimum order. Perfect for prototypes and small production runs.",
      rating: 5,
    },
    {
      name: 'David Rodriguez',
      company: 'Industrial Design Co.',
      text: 'The 3D preview feature is game-changing. We can catch issues before manufacturing starts.',
      rating: 5,
    },
  ]

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Customer love"
          title="Engineers, fabricators, and weekend builders"
        />

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          variants={{ initial: {}, animate: { transition: { staggerChildren: 0.1 } } }}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {items.map((t, i) => (
            <motion.div
              key={i}
              variants={{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
              }}
              className="relative rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-slate-700">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-semibold text-white">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.company}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ---------- CTA ---------- */

function CTASection({ onUpload }: { onUpload: () => void }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 py-20 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-blue-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 h-[28rem] w-[28rem] rounded-full bg-cyan-400/15 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8"
      >
        <div className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-blue-200/80">
          <span className="inline-block h-px w-6 bg-blue-300/60" />
          Ready when you are
          <span className="inline-block h-px w-6 bg-blue-300/60" />
        </div>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          Get a quote in{' '}
          <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
            under 30 seconds
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-300">
          Drop your CAD file. See your part. Get your price. Place your order. That&apos;s the
          entire flow.
        </p>
        <motion.button
          type="button"
          onClick={onUpload}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-4 text-base font-semibold text-slate-900 shadow-2xl shadow-blue-500/20 transition-shadow hover:shadow-blue-500/30"
        >
          <UploadCloud className="h-5 w-5 text-blue-600" />
          Upload CAD &amp; get quote
          <ArrowRight className="h-5 w-5" />
        </motion.button>
      </motion.div>
    </section>
  )
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md">
                <Boxes className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold">TubeBend</span>
            </Link>
            <p className="mt-3 text-sm text-slate-400">
              Professional tube bending from your CAD files.
            </p>
          </div>

          <FooterColumn
            title="Services"
            items={['Tube Bending', 'Custom Fabrication', 'Prototyping', 'Production Runs']}
          />
          <FooterColumn
            title="Materials"
            items={['Steel', 'Aluminum', 'Stainless Steel', 'Copper']}
          />
          <FooterColumn
            title="Support"
            items={['Contact Us', 'Design Guidelines', 'Material Specs', 'Shipping Info']}
          />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-8 text-sm text-slate-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} TubeBend. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              SOC 2 Type II
            </span>
            <span className="text-slate-700">·</span>
            <span>ITAR registered</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold tracking-wide text-white">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-400">
        {items.map(item => (
          <li
            key={item}
            className="cursor-pointer transition-colors hover:text-white"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
