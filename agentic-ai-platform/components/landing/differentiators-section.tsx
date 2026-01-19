'use client'

import { useRef, useEffect, useState } from 'react'
import { Brain, Rocket, PiggyBank } from 'lucide-react'

const differentiators = [
  {
    icon: Brain,
    number: '01',
    title: 'Agentic AI Engine',
    highlight: 'Modern Platform',
    description:
      'Unlike legacy tools with static dashboards, Heliozz uses an intelligent agent that monitors, decides, and acts in real time. Always up-to-date without constant human intervention.',
  },
  {
    icon: Rocket,
    number: '02',
    title: 'Easy Setup',
    highlight: 'Minutes to Deploy',
    description:
      'Deployed within minutes using guided onboarding. No complex integration or steep learning curve. Start identifying savings on Day 1.',
  },
  {
    icon: PiggyBank,
    number: '03',
    title: 'Lower Cost',
    highlight: '1/3 the Price',
    description:
      'Enterprise-grade optimization at a fraction of the cost. Roughly one-third the price of comparable solutions. High ROI from day one.',
  },
]

export function DifferentiatorsSection() {
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
    <section ref={sectionRef} className="relative py-32 lg:py-40 bg-black overflow-hidden">
      {/* Background accent */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-gray-950/50 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-12 lg:px-20">
        {/* Header */}
        <div className={`max-w-2xl mb-20 lg:mb-28 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-[#74ADFE] text-sm tracking-[0.2em] uppercase font-medium mb-4 block">
            Why Heliozz
          </span>
          <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1]">
            Built different.
            <span className="block text-gray-600">For a reason.</span>
          </h2>
        </div>

        {/* Cards - Horizontal layout */}
        <div className="grid lg:grid-cols-3 gap-px bg-gray-800/30">
          {differentiators.map((item, index) => (
            <div
              key={index}
              className={`group bg-black p-10 lg:p-12 transition-all duration-700 hover:bg-gray-900/30 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Top - Number and Icon */}
              <div className="flex items-center justify-between mb-8">
                <span className="text-[#74ADFE]/20 text-sm font-mono tracking-wider">
                  {item.number}
                </span>
                <item.icon className="w-6 h-6 text-[#74ADFE] group-hover:scale-110 transition-transform" />
              </div>

              {/* Highlight badge */}
              <span className="inline-block px-3 py-1 bg-[#296CF0]/10 text-[#74ADFE] text-xs font-medium mb-6">
                {item.highlight}
              </span>

              {/* Title */}
              <h3 className="font-heading text-2xl font-bold text-white mb-4 group-hover:text-[#74ADFE] transition-colors">
                {item.title}
              </h3>

              {/* Description */}
              <p className="text-gray-500 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
