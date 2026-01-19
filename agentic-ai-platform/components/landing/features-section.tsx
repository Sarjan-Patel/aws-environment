'use client'

import { useRef, useEffect, useState } from 'react'
import { Zap, Bell, Cloud, Cog, Bot, BarChart3 } from 'lucide-react'

const features = [
  {
    icon: Zap,
    title: 'Setup in Minutes',
    highlight: '5 min',
    description: 'From sign-up to live optimization. No complex configuration. No engineering overhead.',
  },
  {
    icon: Bell,
    title: 'Proactive Alerts',
    highlight: 'Real-time',
    description: 'Smart notifications detect abnormal spending before it becomes a budget problem.',
  },
  {
    icon: Cloud,
    title: 'Multi-Cloud',
    highlight: 'AWS · Azure · GCP',
    description: 'One unified platform. Complete visibility. Consistent optimization across all providers.',
  },
  {
    icon: Cog,
    title: 'Full Automation',
    highlight: 'Hands-free',
    description: 'Identify. Execute. Enforce. The entire optimization lifecycle, automated.',
  },
  {
    icon: Bot,
    title: 'Agentic AI',
    highlight: 'Always learning',
    description: 'Continuously analyzes workloads, spots inefficiencies, and acts autonomously.',
  },
  {
    icon: BarChart3,
    title: 'Deep Analytics',
    highlight: 'Full visibility',
    description: 'Usage trends, cost drivers, optimization impact. Data-driven decisions.',
  },
]

export function FeaturesSection() {
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
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-6">
        {/* Header - Split layout */}
        <div className={`grid lg:grid-cols-2 gap-8 lg:gap-20 mb-20 lg:mb-28 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div>
            <span className="text-[#74ADFE] text-sm tracking-[0.2em] uppercase font-medium mb-4 block">
              Platform
            </span>
            <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1]">
              Everything you need.
              <span className="block text-gray-600">Nothing you don't.</span>
            </h2>
          </div>
          <div className="lg:pt-12">
            <p className="text-xl text-gray-400 leading-relaxed">
              A comprehensive suite to eliminate cloud waste and maximize value.
              Built for teams who want results, not another dashboard to check.
            </p>
          </div>
        </div>

        {/* Features Grid - Minimal editorial cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Top row - Icon and highlight */}
              <div className="flex items-center justify-between mb-6">
                <feature.icon className="w-5 h-5 text-[#74ADFE]" />
                <span className="text-xs text-gray-600 tracking-wide uppercase">
                  {feature.highlight}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-heading text-xl font-semibold text-white mb-3 group-hover:text-[#74ADFE] transition-colors">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-gray-500 text-sm leading-relaxed">
                {feature.description}
              </p>

              {/* Bottom line */}
              <div className="mt-6 h-px bg-gray-800 group-hover:bg-[#296CF0]/50 transition-colors" />
            </div>
          ))}
        </div>
        </div>
      </div>
    </section>
  )
}
