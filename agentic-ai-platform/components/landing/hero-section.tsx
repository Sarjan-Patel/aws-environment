'use client'

import { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, Shield, Zap, CheckCircle2, ChevronRight, Clock, DollarSign, Cloud, Bot } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import Aurora to avoid SSR issues with WebGL
const Aurora = dynamic(() => import('@/components/aurora'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black" />,
})

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animations after mount
    setIsVisible(true)
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden"
    >
      {/* Aurora Background */}
      <div className="absolute inset-0 bg-black">
        <Aurora
          colorStops={['#296CF0', '#74ADFE', '#296CF0']}
          amplitude={1.2}
          blend={0.5}
          speed={0.3}
        />
      </div>

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 pointer-events-none" />

      <div className="relative z-10 container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col">
        {/* Spacer for navbar */}
        <div className="h-20 lg:h-24 flex-shrink-0" />

        {/* Inner wrapper matching navbar inner padding */}
        <div className="px-4 sm:px-6 flex-1 flex flex-col">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-stretch flex-1">
            {/* Left Content */}
            <div className="flex flex-col justify-center items-center lg:items-start text-center lg:text-left py-12 lg:py-16 max-w-2xl mx-auto lg:mx-0">
            <h1 className={`font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Agentic AI platform to optimize your{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#74ADFE] via-[#84B2F7] to-[#296CF0]">
                cloud infrastructure costs
              </span>
            </h1>

            <p className={`text-lg text-gray-300 mb-8 leading-relaxed transition-all duration-1000 delay-150 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Identify inefficiencies, automate optimization workflows, and provide
              continuous insights to keep cloud costs under control – delivering an
              average of{' '}
              <span className="text-[#74ADFE] font-semibold">20% savings</span> for
              your business.
            </p>

            {/* Feature list */}
            <div className={`flex flex-wrap justify-center lg:justify-start gap-4 mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {[
                'Multi-Cloud Support',
                'Autonomous Actions',
                'Zero Config Setup',
              ].map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-gray-300"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#74ADFE]" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className={`flex flex-wrap justify-center lg:justify-start gap-4 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <Link href="/login">
                <Button
                  size="lg"
                  className="px-8 py-6 text-lg font-semibold bg-white text-black hover:bg-[#74ADFE] hover:text-white transition-all duration-300 hover:-translate-y-0.5 rounded-none"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#solution">
                <Button
                  size="lg"
                  variant="ghost"
                  className="px-8 py-6 text-lg font-semibold text-gray-300 border border-gray-700 bg-transparent hover:bg-white/5 hover:text-white hover:border-gray-500 transition-all duration-300 rounded-none"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Visual */}
          <div className={`relative lg:pl-8 flex items-stretch py-12 lg:py-16 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
            <div className="relative w-full flex">
              {/* Main Card - height matches text content */}
              <div className="relative h-full w-full max-w-[480px] mx-auto overflow-hidden border border-gray-700/60 bg-gray-950">
                {/* Three corner gradient glows */}
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#296CF0]/50 blur-3xl" />
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-[#74ADFE]/35 blur-3xl" />
                <div className="absolute -top-16 -right-8 w-24 h-56 bg-[#296CF0]/25 blur-2xl" />

                {/* Card Content */}
                <div className="relative h-full flex flex-col p-8">
                  {/* Top badges */}
                  <div className="flex flex-wrap gap-2 mb-8">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/80 border border-gray-700/50">
                      <Shield className="w-3.5 h-3.5 text-[#74ADFE]" />
                      <span className="text-gray-300 text-xs font-medium">Enterprise Ready</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/80 border border-gray-700/50">
                      <Bot className="w-3.5 h-3.5 text-[#74ADFE]" />
                      <span className="text-gray-300 text-xs font-medium">Agentic AI</span>
                    </div>
                  </div>

                  {/* Animated Steps */}
                  <div className="flex-1 flex flex-col justify-center space-y-6">
                    {[
                      { icon: Clock, text: 'Setup in under 5 minutes' },
                      { icon: Cloud, text: 'Connect your AWS, Azure, or GCP' },
                      { icon: Bot, text: 'AI analyzes your infrastructure' },
                      { icon: DollarSign, text: 'Stop paying for idle resources' },
                      { icon: Zap, text: 'Automated actions, zero effort' },
                    ].map((step, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-4 transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                        style={{ transitionDelay: `${600 + index * 100}ms` }}
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-[#296CF0]/20 border border-[#296CF0]/30 flex items-center justify-center">
                          <step.icon className="w-5 h-5 text-[#74ADFE]" />
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 text-[#74ADFE]" />
                          <span className="text-white font-medium">{step.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom tagline */}
                  <div className="mt-auto pt-6 border-t border-gray-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-[#74ADFE] animate-pulse" />
                      <span className="text-[#74ADFE] text-sm font-medium">24/7 Autonomous</span>
                    </div>
                    <p className="text-white text-xl font-semibold leading-tight font-heading">
                      Save 20%+ on cloud costs automatically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Bottom Stats Bar */}
          <div className={`py-12 lg:py-16 flex-shrink-0 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex flex-wrap justify-center gap-8 sm:gap-12 lg:gap-20">
            {[
              { value: '20%+', label: 'Average Savings' },
              { value: '5 min', label: 'Setup Time' },
              { value: '3 Clouds', label: 'Supported' },
              { value: '24/7', label: 'Automation' },
            ].map((stat, index) => (
              <div key={index} className="text-center lg:text-left">
                <p className="text-3xl lg:text-4xl font-bold text-white font-heading">{stat.value}</p>
                <p className="text-gray-400 text-sm mt-1 tracking-wide">{stat.label}</p>
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
