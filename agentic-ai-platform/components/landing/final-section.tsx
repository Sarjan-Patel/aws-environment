'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowUpRight, Send } from 'lucide-react'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export function FinalSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    if (!sectionRef.current) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      // Reveal the main text with a clip-path animation
      gsap.fromTo('.reveal-text',
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)',
          duration: 1.2,
          ease: 'power4.inOut',
          stagger: 0.2,
          scrollTrigger: {
            trigger: '.main-content',
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      )

      // Animate the accent line
      gsap.fromTo('.accent-line',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.5,
          ease: 'power4.inOut',
          scrollTrigger: {
            trigger: '.main-content',
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        }
      )

      // Fade in the secondary content
      gsap.fromTo('.fade-up',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.secondary-content',
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        }
      )

      // Subtle continuous animation for the outline text
      gsap.to('.outline-text', {
        backgroundPosition: '200% center',
        duration: 8,
        ease: 'none',
        repeat: -1,
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="waitlist"
      className="relative min-h-[75vh] flex flex-col bg-black overflow-hidden"
    >
      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-20">
        <div className="max-w-[1400px] mx-auto w-full">

          {/* Main content - side by side layout */}
          <div className="main-content grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left - Headline */}
            <div>
              {/* Small label */}
              <div className="reveal-text mb-6 lg:mb-8">
                <span className="text-[#74ADFE] text-sm tracking-[0.3em] uppercase font-medium">
                  Cloud Cost Intelligence
                </span>
              </div>

              {/* Primary headline - editorial style stacking */}
              <div className="space-y-2 lg:space-y-4">
                <h2 className="reveal-text">
                  <span className="block text-white text-[11vw] sm:text-[9vw] lg:text-[5.5vw] font-bold leading-[0.9] tracking-tight font-heading">
                    Stop wasting
                  </span>
                </h2>
                <h2 className="reveal-text">
                  <span className="block text-white text-[11vw] sm:text-[9vw] lg:text-[5.5vw] font-bold leading-[0.9] tracking-tight font-heading">
                    money on
                  </span>
                </h2>
                <h2 className="reveal-text">
                  <span
                    className="outline-text block text-[11vw] sm:text-[9vw] lg:text-[5.5vw] font-bold leading-[0.9] tracking-tight font-heading"
                    style={{
                      WebkitTextStroke: '1.5px #74ADFE',
                      WebkitTextFillColor: 'transparent',
                      backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(116, 173, 254, 0.1) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      backgroundClip: 'text',
                    }}
                  >
                    the cloud.
                  </span>
                </h2>
              </div>

              {/* Accent line */}
              <div className="accent-line mt-10 lg:mt-14 h-px bg-gradient-to-r from-[#74ADFE] via-[#296CF0] to-transparent max-w-md origin-left" />
            </div>

            {/* Right - Description and CTAs */}
            <div className="secondary-content lg:pl-8">
              <p className="fade-up text-gray-400 text-lg lg:text-xl leading-relaxed mb-10">
                Heliozz uses agentic AI to continuously monitor, analyze, and optimize your
                cloud infrastructure. Autonomous. Intelligent. Always on.
              </p>

              {/* CTA Buttons */}
              <div className="fade-up flex flex-col sm:flex-row gap-4">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="group px-8 py-6 text-base font-medium bg-white text-black hover:bg-[#74ADFE] hover:text-white transition-all duration-500 rounded-none"
                  >
                    Start Optimizing
                    <ArrowUpRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Button>
                </Link>

                <Link href="mailto:contact@heliozz.com">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="px-8 py-6 text-base font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-300 rounded-none border border-gray-800 hover:border-gray-600"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Get in Touch
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Footer */}
      <footer className="relative z-10 py-8 px-6 sm:px-12 lg:px-20 border-t border-gray-800/30">
        <div className="max-w-[1400px] mx-auto w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <span className="font-heading font-bold text-2xl sm:text-3xl text-white tracking-tight">
              Heliozz
            </span>

            {/* Right side */}
            <div className="flex items-center gap-8 text-gray-500 text-sm">
              <span className="hidden sm:inline">Agentic AI for Cloud</span>
              <span>&copy; {currentYear}</span>
            </div>
          </div>
        </div>
      </footer>
    </section>
  )
}
