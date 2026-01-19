'use client'

import { useRef, useEffect, useState } from 'react'

const providers = [
  { name: 'Amazon Web Services', short: 'AWS' },
  { name: 'Microsoft Azure', short: 'Azure' },
  { name: 'Google Cloud', short: 'GCP' },
]

export function SolutionSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} id="solution" className="relative py-32 lg:py-40 bg-black">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-6">
        <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Label */}
          <span className="text-[#74ADFE] text-sm tracking-[0.2em] uppercase font-medium mb-6 block">
            The Solution
          </span>

          {/* Main headline */}
          <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-8">
            Meet{' '}
            <span
              style={{
                WebkitTextStroke: '1.5px #74ADFE',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Heliozz
            </span>
          </h2>

          {/* Description */}
          <p className="text-xl text-gray-400 leading-relaxed mb-12 max-w-3xl mx-auto">
            An AI-driven platform that autonomously optimizes cloud costs.
            Continuously analyzes usage patterns, identifies inefficiencies,
            and takes automated actions to reduce spending. No human intervention required.
          </p>

          {/* Providers */}
          <div className={`flex flex-wrap justify-center gap-4 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {providers.map((provider, index) => (
              <div
                key={index}
                className="px-6 py-3 bg-gray-900/50 border border-gray-800 text-gray-300 text-sm font-medium hover:border-[#296CF0]/50 hover:text-white transition-all"
              >
                {provider.name}
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </section>
  )
}
