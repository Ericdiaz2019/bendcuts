'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Ruler,
  Truck,
  ShieldCheck,
  Phone,
} from 'lucide-react'

import SiteNav from '@/components/site-nav'
import { ACCEPTED_CAD_EXTENSIONS, getCadFormatCapability } from '@/lib/cad/formatCapabilities'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function HomePage() {
  const router = useRouter()
  const [isDragActive, setIsDragActive] = useState(false)
  const [error, setError] = useState('')

  /* ---------- Drag/drop logic — DO NOT change ---------- */

  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    if (file.size > MAX_FILE_SIZE) {
      return { isValid: false, error: 'File size must be under 50MB' }
    }

    const extension = file.name.toLowerCase().split('.').pop()

    if (!getCadFormatCapability(extension)) {
      return {
        isValid: false,
        error: 'File must be STEP, IGES, DXF, DWG, AI, or EPS format',
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
    input.accept = ACCEPTED_CAD_EXTENSIONS.map(ext => `.${ext}`).join(',')
    input.addEventListener('change', handleFileSelect, { once: true })
    input.click()
  }, [handleFileSelect])

  /* ---------- Render ---------- */

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <SiteNav />
      <Hero
        isDragActive={isDragActive}
        error={error}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onUploadClick={handleUploadClick}
      />
      <Capabilities />
      <HowItWorks />
      <MaterialsSection />
      <ShopSection />
      <Testimonials />
      <CTASection onUpload={handleUploadClick} />
      <Footer />
    </div>
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
    <section className="relative pt-16">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Tube bending &amp; sheet metal fabrication
            </div>

            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl md:text-[3.4rem] md:leading-[1.05]">
              Custom bent tubes and cut sheet,
              <span className="text-amber-600"> made to order.</span>
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-stone-600 sm:text-lg">
              Upload STEP/STP for instant 3D analysis, DXF for 2D preview, or
              DWG, AI, and EPS for engineering review. Carbon steel, aluminum,
              and stainless &mdash; bent, cut, and shipped in 3 to 5 business days.
            </p>

            <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-stone-600">
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-600" />
                No minimum order
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-600" />
                Line-item pricing
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-600" />
                Made in the USA
              </li>
            </ul>

            <div className="mt-8 hidden items-center gap-4 sm:flex">
              <button
                type="button"
                onClick={onUploadClick}
                className="inline-flex items-center gap-2 rounded-md bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800"
              >
                <UploadCloud className="h-4 w-4" />
                Upload CAD file
              </button>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 hover:bg-stone-100"
              >
                <Phone className="h-4 w-4" />
                Talk to a fabricator
              </Link>
            </div>
          </div>

          {/* Right column: hero image + dropzone */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="relative aspect-[5/4] w-full">
                <Image
                  src="/images/bent-tubes-hero.jpg"
                  alt="Precision bent metal tubes arranged on a neutral backdrop"
                  fill
                  priority
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="mt-4">
              <HeroDropzone
                isDragActive={isDragActive}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onUploadClick={onUploadClick}
              />

              {error && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
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
      className={`group cursor-pointer rounded-2xl border-2 border-dashed bg-white p-5 transition-colors sm:p-6 ${
        isDragActive
          ? 'border-amber-500 bg-amber-50'
          : 'border-stone-300 hover:border-amber-400 hover:bg-stone-50'
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${
            isDragActive ? 'bg-amber-500 text-white' : 'bg-stone-900 text-amber-400'
          }`}
        >
          <UploadCloud className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-900">
            {isDragActive ? 'Release to upload' : 'Drop your CAD file here'}
          </p>
          <p className="mt-0.5 text-xs text-stone-600">
            STEP, DXF, DWG, AI, EPS &middot; up to 50&nbsp;MB &middot;{' '}
            <span className="font-medium text-amber-700 underline-offset-4 group-hover:underline">
              browse files
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

/* ---------- Capabilities ---------- */

function Capabilities() {
  const items = [
    {
      title: 'CNC tube bending',
      desc: 'Round and square tube up to 2.5″ OD. Mandrel, rotary draw, and roll bending.',
    },
    {
      title: 'Laser tube cutting',
      desc: '5-axis fiber laser for copes, slots, and holes — laser features included at no upcharge.',
    },
    {
      title: 'Sheet metal cutting',
      desc: 'Up to 0.5″ steel and 0.5″ aluminum on 5×10 ft fiber laser tables.',
    },
    {
      title: '3D printing',
      desc: 'FDM and SLS prototyping in PLA, PETG, ABS, Nylon and TPU. Single-part minimum.',
    },
  ]

  return (
    <section id="capabilities" className="border-y border-stone-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Capabilities
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            What we make in our shop
          </h2>
          <p className="mt-4 text-base leading-relaxed text-stone-600">
            We&apos;re a focused fab shop &mdash; tube benders, laser cutters, and press
            brakes under one roof. No marketplace middleman, no hidden fees.
          </p>
        </div>

        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(item => (
            <div key={item.title} className="bg-white p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                <Wrench className="h-4 w-4" />
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-stone-900">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- How it works ---------- */

function HowItWorks() {
  const steps = [
    {
      icon: UploadCloud,
      title: 'Upload your drawing',
      desc: 'Send us STEP/STP for 3D analysis, DXF for 2D preview, or DWG, AI, and EPS for engineering review.',
    },
    {
      icon: Ruler,
      title: 'Pick material & quantity',
      desc: 'Choose from carbon steel, aluminum, or stainless. Wall thickness, gauge, and quantity update the price live.',
    },
    {
      icon: Truck,
      title: 'We bend, cut, and ship',
      desc: 'Your parts run on the shop floor and ship in 3 to 5 business days, fully tracked.',
    },
  ]

  return (
    <section id="how-it-works" className="bg-stone-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            From CAD file to finished part
          </h2>
          <p className="mt-4 text-base leading-relaxed text-stone-600">
            No phone tag, no five-day quote turnaround. Three steps, one straight line
            from your screen to your dock.
          </p>
        </div>

        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="rounded-xl border border-stone-200 bg-white p-6"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-amber-700">
                  0{i + 1}
                </span>
                <span className="h-px flex-1 bg-stone-200" />
                <step.icon className="h-5 w-5 text-stone-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-stone-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ---------- Materials ---------- */

function MaterialsSection() {
  const materials = [
    {
      name: 'Carbon Steel',
      desc: 'Strong, durable, cost-effective. A36, 1018, and DOM tubing.',
      color: '#5b5b5b',
      price: 1.85,
    },
    {
      name: 'Aluminum',
      desc: '6061-T6 and 5052 — lightweight, marine, and architectural.',
      color: '#a8a8a8',
      price: 2.5,
    },
    {
      name: 'Stainless Steel',
      desc: '304 and 316 — corrosion-resistant, food and chemical grade.',
      color: '#c8c8c8',
      price: 4.75,
    },
    {
      name: 'Copper',
      desc: 'Pure copper — plumbing, electrical, and decorative work.',
      color: '#b87333',
      price: 5.2,
    },
  ]

  return (
    <section id="materials" className="border-y border-stone-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              Materials
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Stocked and priced live
            </h2>
            <p className="mt-4 text-base leading-relaxed text-stone-600">
              We carry the most common gauges and tube sizes on the rack &mdash; pricing
              updates with the metals market, not a stale spreadsheet.
            </p>
          </div>
          <Link
            href="/configure"
            className="text-sm font-semibold text-amber-700 hover:text-amber-800"
          >
            See all gauges &rarr;
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {materials.map(m => (
            <div
              key={m.name}
              className="rounded-xl border border-stone-200 bg-stone-50 p-5"
            >
              <div className="flex items-center gap-3">
                <div
                  aria-hidden
                  className="h-10 w-10 rounded-full ring-1 ring-inset ring-stone-300"
                  style={{
                    background: `linear-gradient(135deg, ${m.color} 0%, #fff 220%)`,
                  }}
                />
                <h3 className="text-base font-semibold tracking-tight text-stone-900">
                  {m.name}
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">{m.desc}</p>
              <div className="mt-4 flex items-baseline justify-between border-t border-stone-200 pt-3">
                <span className="text-xs uppercase tracking-wider text-stone-500">
                  From
                </span>
                <span>
                  <span className="text-base font-semibold tabular-nums text-stone-900">
                    ${m.price.toFixed(2)}
                  </span>
                  <span className="ml-1 text-xs uppercase tracking-wider text-stone-500">
                    /lb
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- Shop / Trust ---------- */

function ShopSection() {
  const stats = [
    { value: '1,200+', label: 'Parts shipped' },
    { value: '97%', label: 'On-time delivery' },
    { value: '±0.005"', label: 'Tolerance held' },
    { value: '4.9/5', label: 'Customer rating' },
  ]

  return (
    <section className="bg-stone-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src="/images/shop-floor.jpg"
                alt="A modern tube bending and laser cutting fabrication shop"
                fill
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              Built in the shop
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Real fabricators. Real machines. No middleman.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-stone-600">
              Every part is bent, cut, and inspected in our own facility. When you
              order from TubeBend, you&apos;re working directly with the people running
              the machines &mdash; not a marketplace forwarding your file to the lowest
              bidder.
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-stone-200">
              {stats.map(stat => (
                <div key={stat.label} className="bg-white p-5">
                  <dt className="text-xs font-medium uppercase tracking-wider text-stone-500">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              ITAR registered &middot; ISO 9001 in progress
            </div>
          </div>
        </div>
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
      text: 'Transparent pricing saved us hours of back-and-forth quotes. Quality is consistent every time.',
    },
    {
      name: 'Sarah Johnson',
      company: 'Custom Motorcycle Shop',
      text: 'No minimum order is huge for a small shop. Perfect for prototypes and short runs.',
    },
    {
      name: 'David Rodriguez',
      company: 'Industrial Design Co.',
      text: 'The 3D preview catches issues before parts hit the floor. Saves real money.',
    },
  ]

  return (
    <section className="border-y border-stone-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Trusted by builders
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Engineers, fabricators, and weekend builders
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {items.map(t => (
            <figure
              key={t.name}
              className="rounded-xl border border-stone-200 bg-stone-50 p-6"
            >
              <blockquote className="text-[15px] leading-relaxed text-stone-700">
                &ldquo;{t.text}&rdquo;
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-stone-200 pt-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-sm font-semibold text-amber-400">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-900">{t.name}</div>
                  <div className="text-xs text-stone-500">{t.company}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- CTA ---------- */

function CTASection({ onUpload }: { onUpload: () => void }) {
  return (
    <section className="bg-stone-900 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 rounded-2xl bg-stone-800 p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:gap-12">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Ready to make some parts?
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-300">
              Upload your CAD file and you&apos;ll see your quote in under a minute.
              No account required to price out a job.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            <button
              type="button"
              onClick={onUpload}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-6 py-3 text-sm font-semibold text-stone-900 hover:bg-amber-400"
            >
              <UploadCloud className="h-4 w-4" />
              Upload CAD file
            </button>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-600 bg-transparent px-6 py-3 text-sm font-semibold text-white hover:bg-stone-700"
            >
              <Phone className="h-4 w-4" />
              Talk to us
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="bg-stone-950 text-stone-300">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-stone-800">
                <Wrench className="h-4 w-4 text-amber-400" />
              </div>
              <span className="text-lg font-semibold text-white">TubeBend</span>
            </Link>
            <p className="mt-3 text-sm text-stone-400">
              Tube bending and sheet metal fabrication, made to order from your CAD
              files.
            </p>
          </div>

          <FooterColumn
            title="Services"
            items={['CNC Tube Bending', 'Laser Tube Cutting', 'Sheet Cutting', '3D Printing']}
          />
          <FooterColumn
            title="Materials"
            items={['Carbon Steel', 'Aluminum', 'Stainless Steel', 'Copper']}
          />
          <FooterColumn
            title="Company"
            items={['Contact', 'Design Guidelines', 'Material Specs', 'Shipping Info']}
          />
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-stone-800 pt-8 text-sm text-stone-500 sm:flex-row sm:items-center">
          <p>&copy; {new Date().getFullYear()} TubeBend. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
              ITAR registered
            </span>
            <span className="text-stone-700">&middot;</span>
            <span>Made in the USA</span>
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
      <ul className="mt-3 space-y-2 text-sm text-stone-400">
        {items.map(item => (
          <li key={item} className="cursor-pointer transition-colors hover:text-white">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
