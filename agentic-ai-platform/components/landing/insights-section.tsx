'use client'

import { useRef, useEffect, useState } from 'react'

const insights = [
  {
    value: '30%+',
    source: 'BCG (2025)',
    description: 'of cloud budgets wasted on idle resources',
  },
  {
    value: '70%',
    source: 'CNCF (2025)',
    description: 'cite over-provisioning as primary waste factor',
  },
  {
    value: '83%',
    source: 'Azul (2025)',
    description: 'of CIOs spending more than anticipated',
  },
  {
    value: '32%',
    source: '2Data (2025)',
    description: 'of cloud spend is ultimately wasted',
  },
]

export function InsightsSection() {
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
    <section
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-gradient-to-b from-black via-gray-950/50 to-black"
    >
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-6">
        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-[#74ADFE] text-sm tracking-[0.2em] uppercase font-medium mb-4 block">
            Industry Data
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white">
            The numbers don't lie.
          </h2>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`text-center transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#74ADFE] mb-3 font-heading">
                {insight.value}
              </div>
              <p className="text-gray-400 text-sm mb-2 leading-relaxed">
                {insight.description}
              </p>
              <p className="text-gray-600 text-xs">{insight.source}</p>
            </div>
          ))}
        </div>
        </div>
      </div>
    </section>
  )
}
