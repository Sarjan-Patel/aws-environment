'use client'

import { useRef, useEffect, useState } from 'react'
import { TrendingUp, Hand, Puzzle, CircleDollarSign } from 'lucide-react'

const challenges = [
  {
    icon: TrendingUp,
    title: 'Costs Keep Rising',
    stat: '32%',
    statLabel: 'of cloud spend wasted',
    description: 'Limited visibility across multiple clouds. Resources scattered. Spending out of control.',
  },
  {
    icon: Hand,
    title: 'Manual Work',
    stat: '40+',
    statLabel: 'hours per month',
    description: 'Analyzing dashboards. Executing optimizations. Missing savings opportunities.',
  },
  {
    icon: Puzzle,
    title: 'Skill Gaps',
    stat: '70%',
    statLabel: 'cite complexity',
    description: 'Cloud optimization is hard. Without expertise, the best savings stay hidden.',
  },
  {
    icon: CircleDollarSign,
    title: 'Missed Incentives',
    stat: '$$$',
    statLabel: 'left on the table',
    description: 'Reserved instances. Spot pricing. Commitments. Money left unclaimed.',
  },
]

export function ProblemsSection() {
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
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(#74ADFE 1px, transparent 1px), linear-gradient(90deg, #74ADFE 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-6">
        {/* Header */}
        <div className={`max-w-2xl mb-20 lg:mb-28 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-[#74ADFE] text-sm tracking-[0.2em] uppercase font-medium mb-4 block">
            The Problem
          </span>
          <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1]">
            Cloud costs are
            <span className="text-[#74ADFE]"> broken.</span>
          </h2>
        </div>

        {/* Challenges Grid - Editorial cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-800/30">
          {challenges.map((challenge, index) => (
            <div
              key={index}
              className={`group bg-black p-8 lg:p-10 transition-all duration-700 hover:bg-gray-900/50 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Icon */}
              <challenge.icon className="w-6 h-6 text-[#74ADFE] mb-8 group-hover:scale-110 transition-transform" />

              {/* Stat */}
              <div className="mb-6">
                <span className="text-4xl lg:text-5xl font-bold text-white font-heading">
                  {challenge.stat}
                </span>
                <span className="block text-gray-600 text-xs tracking-wide mt-1 uppercase">
                  {challenge.statLabel}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="font-heading text-lg font-semibold text-white mb-3">
                {challenge.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {challenge.description}
              </p>

              {/* Bottom accent line */}
              <div className="mt-8 h-px bg-gradient-to-r from-[#296CF0] to-transparent w-0 group-hover:w-full transition-all duration-500" />
            </div>
          ))}
        </div>
        </div>
      </div>
    </section>
  )
}
