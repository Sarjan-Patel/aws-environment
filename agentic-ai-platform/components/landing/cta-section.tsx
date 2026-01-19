'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, Mail } from 'lucide-react'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export function CTASection() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      gsap.fromTo('.cta-content',
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        }
      )

      gsap.fromTo('.cta-buttons',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'back.out(1.4)',
          scrollTrigger: {
            trigger: '.cta-buttons',
            start: 'top 95%',
            toggleActions: 'play none none none',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="waitlist"
      className="py-24 bg-gradient-to-b from-gray-950 to-black relative overflow-hidden"
    >
      {/* Background gradient orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#296CF0]/10 rounded-full blur-[150px]" />

      <div className="container max-w-3xl px-4 relative z-10">
        <div className="cta-content text-center">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Are you ready to optimize your{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#74ADFE] to-[#296CF0]">
              cloud costs
            </span>
            ?
          </h2>

          <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
            Start reducing cloud spend and boosting efficiency with Heliozz. There's
            no risk and no long-term commitment – just immediate, measurable savings
            from day one of using our platform.
          </p>

          <div className="cta-buttons flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button
                size="lg"
                className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-[#296CF0] to-[#74ADFE] hover:from-[#74ADFE] hover:to-[#296CF0] text-white shadow-lg shadow-[#296CF0]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#296CF0]/30 hover:-translate-y-0.5 w-full sm:w-auto"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <Link href="mailto:contact@heliozz.com">
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-lg font-semibold border-gray-700 text-gray-300 hover:bg-gray-900 hover:text-white hover:border-gray-600 transition-all duration-300 w-full sm:w-auto"
              >
                <Mail className="mr-2 h-5 w-5" />
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
