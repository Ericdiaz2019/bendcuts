import type { Variants, Transition } from 'framer-motion'

export const easeOut: Transition['ease'] = [0.16, 1, 0.3, 1]
export const easeInOut: Transition['ease'] = [0.65, 0, 0.35, 1]

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25, ease: easeInOut } },
}

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3, ease: easeOut } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

export const stagger = (delayChildren = 0.05, staggerChildren = 0.06): Variants => ({
  initial: {},
  animate: {
    transition: { delayChildren, staggerChildren },
  },
})

export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: easeOut } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } },
}
