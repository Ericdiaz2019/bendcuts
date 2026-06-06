'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  UploadCloud,
  Wrench,
} from 'lucide-react'

import SiteNav from '@/components/site-nav'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    await new Promise(resolve => setTimeout(resolve, 1000))

    setIsSubmitting(false)
    setIsSubmitted(true)

    setTimeout(() => {
      setIsSubmitted(false)
      setFormData({
        name: '',
        email: '',
        company: '',
        phone: '',
        subject: '',
        message: '',
      })
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <SiteNav />
      <Hero />
      <ContactSection
        formData={formData}
        isSubmitting={isSubmitting}
        isSubmitted={isSubmitted}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
      />
      <FAQ />
      <CTASection />
      <Footer />
    </div>
  )
}


/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="relative pt-16">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Contact the shop
          </div>

          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl md:text-[3.4rem] md:leading-[1.05]">
            Talk to a fabricator,
            <span className="text-amber-600"> not a sales rep.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-stone-600 sm:text-lg">
            Got a tricky bend, a tight tolerance, or a question about materials?
            Send us a note or give us a ring &mdash; we get back to every message
            within one business day.
          </p>

          <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-stone-600">
            <li className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-600" />
              Replies within 24 hours
            </li>
            <li className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-600" />
              Real engineers on the line
            </li>
            <li className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-600" />
              No phone tree
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ---------- Contact info + form ---------- */

interface ContactSectionProps {
  formData: {
    name: string
    email: string
    company: string
    phone: string
    subject: string
    message: string
  }
  isSubmitting: boolean
  isSubmitted: boolean
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void
  onSubmit: (e: React.FormEvent) => void
}

function ContactSection({
  formData,
  isSubmitting,
  isSubmitted,
  onChange,
  onSubmit,
}: ContactSectionProps) {
  const channels = [
    {
      icon: Mail,
      title: 'Email',
      lines: ['sales@tubebend.com', 'support@tubebend.com'],
    },
    {
      icon: Phone,
      title: 'Phone',
      lines: ['1-800-TUBE-BEND', '(1-800-882-3236)'],
    },
    {
      icon: MapPin,
      title: 'Shop address',
      lines: ['1234 Manufacturing Drive', 'Industrial Park, CA 90210', 'United States'],
    },
    {
      icon: Clock,
      title: 'Shop hours',
      lines: ['Mon – Fri · 6:00 AM – 6:00 PM PST', 'Sat · 8:00 AM – 2:00 PM PST', 'Sun · Closed'],
    },
  ]

  return (
    <section className="border-y border-stone-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16">
          {/* Contact info */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              Reach us
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Four ways to get in touch
            </h2>
            <p className="mt-4 text-base leading-relaxed text-stone-600">
              Whether it&apos;s a one-off prototype or a production run, you&apos;ll
              talk to someone who&apos;s actually run the machine.
            </p>

            <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-stone-200 sm:grid-cols-2">
              {channels.map(c => (
                <li key={c.title} className="bg-white p-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                    <c.icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold tracking-tight text-stone-900">
                    {c.title}
                  </h3>
                  <div className="mt-1.5 space-y-0.5 text-sm leading-relaxed text-stone-600">
                    {c.lines.map(line => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-6">
              <h3 className="text-base font-semibold tracking-tight text-stone-900">
                Need an answer faster?
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                Production emergency or a CAD question that&apos;s blocking your
                build? Skip the form.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <a
                  href="tel:18008823236"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800"
                >
                  <Phone className="h-4 w-4" />
                  Call the shop
                </a>
                <a
                  href="mailto:support@tubebend.com"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 hover:bg-stone-100"
                >
                  <Mail className="h-4 w-4" />
                  Email support
                </a>
              </div>
            </div>
          </div>

          {/* Form */}
          <div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                Send a message
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
                Tell us about your project
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                Got drawings, dimensions, or just an idea? The more you share,
                the better we can quote it.
              </p>

              {isSubmitted ? (
                <div className="mt-8 flex flex-col items-center rounded-xl border border-amber-200 bg-amber-50 px-6 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-stone-900">
                    Message sent
                  </h3>
                  <p className="mt-1 max-w-sm text-sm leading-relaxed text-stone-600">
                    Thanks for reaching out. A fabricator will reply within one
                    business day.
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="mt-8 space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      id="name"
                      label="Full name"
                      required
                      value={formData.name}
                      onChange={onChange}
                    />
                    <Field
                      id="email"
                      label="Email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={onChange}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      id="company"
                      label="Company"
                      value={formData.company}
                      onChange={onChange}
                    />
                    <Field
                      id="phone"
                      label="Phone"
                      type="tel"
                      value={formData.phone}
                      onChange={onChange}
                    />
                  </div>

                  <Field
                    id="subject"
                    label="Subject"
                    required
                    value={formData.subject}
                    onChange={onChange}
                  />

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-stone-800"
                    >
                      Message <span className="text-amber-700">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={onChange}
                      required
                      rows={6}
                      placeholder="Tell us about the part, materials, quantity, and any deadlines…"
                      className="mt-2 block w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      'Sending…'
                    ) : (
                      <>
                        Send message
                        <Send className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <p className="text-xs leading-relaxed text-stone-500">
                    By sending this message you agree to be contacted about your
                    project. We don&apos;t share your details.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

interface FieldProps {
  id: string
  label: string
  type?: string
  required?: boolean
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function Field({ id, label, type = 'text', required, value, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-stone-800">
        {label}
        {required && <span className="ml-0.5 text-amber-700">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        className="mt-2 block w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
      />
    </div>
  )
}

/* ---------- FAQ ---------- */

function FAQ() {
  const faqs = [
    {
      question: 'What file formats do you accept?',
      answer:
        'STEP (.step / .stp), IGES (.iges / .igs), DXF (.dxf), DWG (.dwg), AI (.ai), and EPS (.eps), up to 50 MB. STEP and IGES get the strongest automated analysis today; DWG, AI, and EPS require engineering review.',
    },
    {
      question: 'How fast is your turnaround?',
      answer:
        'Standard orders ship in 3 – 5 business days. Rush jobs (1 – 2 days) are available for an upcharge — just flag it in your message.',
    },
    {
      question: 'Do you have minimum order requirements?',
      answer:
        'Nope. We run single prototypes and production batches alike. The price per part scales with quantity, but there&rsquo;s no minimum to get started.',
    },
    {
      question: 'Can you help with design for manufacturability?',
      answer:
        'Yes — our fabricators will flag tight bends, weak welds, or material choices that&rsquo;ll cost you. Send the file, we&rsquo;ll send notes.',
    },
  ]

  return (
    <section className="bg-stone-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            FAQ
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Common questions
          </h2>
          <p className="mt-4 text-base leading-relaxed text-stone-600">
            Quick answers before you write. If your question isn&apos;t here,
            send it through the form &mdash; we&apos;ll add it.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {faqs.map(faq => (
            <div
              key={faq.question}
              className="rounded-xl border border-stone-200 bg-white p-6"
            >
              <h3 className="text-base font-semibold tracking-tight text-stone-900">
                {faq.question}
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed text-stone-600"
                dangerouslySetInnerHTML={{ __html: faq.answer }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- CTA ---------- */

function CTASection() {
  return (
    <section className="bg-stone-900 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 rounded-2xl bg-stone-800 p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:gap-12">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Skip the form &mdash; get a quote.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-300">
              Already have a CAD file? Drop it on the homepage and you&apos;ll
              see line-item pricing in under a minute.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-6 py-3 text-sm font-semibold text-stone-900 hover:bg-amber-400"
            >
              <UploadCloud className="h-4 w-4" />
              Upload CAD file
            </Link>
            <a
              href="tel:18008823236"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-600 bg-transparent px-6 py-3 text-sm font-semibold text-white hover:bg-stone-700"
            >
              <Phone className="h-4 w-4" />
              Call the shop
            </a>
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
              Tube bending and sheet metal fabrication, made to order from your
              CAD files.
            </p>
          </div>

          <FooterColumn
            title="Services"
            items={['CNC Tube Bending', 'Laser Tube Cutting', 'Sheet Cutting', 'Prototyping']}
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
