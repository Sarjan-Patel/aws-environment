'use client'

import { useRef, useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'

export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null)
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
      id="about"
      className="relative py-32 lg:py-40 bg-black overflow-hidden"
    >
      {/* Subtle background accent */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#296CF0]/5 to-transparent pointer-events-none" />

      <div className="relative z-10 container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-6">
        {/* Header - Editorial style */}
        <div className={`mb-20 lg:mb-32 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-4 h-4 text-[#74ADFE]" />
            <span className="text-[#74ADFE] text-sm tracking-[0.2em] uppercase font-medium">
              San Francisco, CA
            </span>
          </div>

          <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] max-w-3xl">
            We've lived the
            <span className="block mt-2" style={{
              WebkitTextStroke: '1px #74ADFE',
              WebkitTextFillColor: 'transparent',
            }}>
              cloud cost chaos.
            </span>
          </h2>
        </div>

        {/* Content Grid - Asymmetric editorial layout */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Left column - Main story */}
          <div className={`lg:col-span-7 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="border-l-2 border-[#296CF0] pl-8 lg:pl-12">
              <p className="text-xl lg:text-2xl text-gray-300 leading-relaxed mb-8">
                We've spent years managing large-scale cloud environments. Meeting with finance
                to explain unexpected spikes. Digging through billing data at midnight. Watching
                savings initiatives die in approval queues.
              </p>
              <p className="text-lg text-gray-400 leading-relaxed">
                Heliozz was built by engineers who got tired of the status quo. We believe teams
                should focus on building products, not firefighting cloud costs.
              </p>
            </div>
          </div>

          {/* Right column - Key points */}
          <div className={`lg:col-span-5 lg:pt-12 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="space-y-12">
              {[
                {
                  number: '01',
                  title: 'Our Mission',
                  text: 'Empower companies to innovate without waste. Autonomous optimization across AWS, Azure, and GCP.',
                },
                {
                  number: '02',
                  title: 'Our Approach',
                  text: 'Not more dashboards. A platform that monitors, decides, and acts. The future of cloud cost management.',
                },
                {
                  number: '03',
                  title: 'Our Promise',
                  text: 'Full audit tracking, rollback protection, and guardrails. Enterprise-grade security, startup-level speed.',
                },
              ].map((item, index) => (
                <div key={index} className="group">
                  <div className="flex items-start gap-6">
                    <span className="text-[#74ADFE]/30 text-sm font-mono tracking-wider">
                      {item.number}
                    </span>
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-white mb-2 group-hover:text-[#74ADFE] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-gray-500 text-sm leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  )
}
