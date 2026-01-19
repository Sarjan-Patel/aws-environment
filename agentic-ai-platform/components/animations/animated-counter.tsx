'use client'

import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

interface AnimatedCounterProps {
  end: number
  suffix?: string
  duration?: number
  className?: string
}

export function AnimatedCounter({
  end,
  suffix = '',
  duration = 2,
  className = '',
}: AnimatedCounterProps) {
  const counterRef = useRef<HTMLSpanElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    if (!counterRef.current || hasAnimated) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) {
      if (counterRef.current) {
        counterRef.current.textContent = Math.round(end) + suffix
      }
      return
    }

    const obj = { value: 0 }

    const animation = gsap.to(obj, {
      value: end,
      duration,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: counterRef.current,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      onUpdate: () => {
        if (counterRef.current) {
          counterRef.current.textContent = Math.round(obj.value) + suffix
        }
      },
      onComplete: () => {
        setHasAnimated(true)
      },
    })

    return () => {
      animation.kill()
    }
  }, [end, suffix, duration, hasAnimated])

  return (
    <span ref={counterRef} className={`tabular-nums ${className}`}>
      0{suffix}
    </span>
  )
}
