'use client'

import { useRef, useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'

const comparisons = [
  { aspect: 'AI-Native Application', heliozz: true, others: false },
  { aspect: 'Subscription Cost', heliozz: 'Low', others: 'High' },
  { aspect: 'Optimization Execution', heliozz: 'Automatic', others: 'Manual' },
  { aspect: 'Deployment Architecture', heliozz: true, others: false },
  { aspect: 'Initial Setup', heliozz: 'Easy', others: 'Difficult' },
]

export function ComparisonSection() {
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

  const renderValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <div className="w-8 h-8 bg-green-500/20 flex items-center justify-center">
          <Check className="w-5 h-5 text-green-400" />
        </div>
      ) : (
        <div className="w-8 h-8 bg-red-500/20 flex items-center justify-center">
          <X className="w-5 h-5 text-red-400" />
        </div>
      )
    }
    return <span className="text-gray-300">{value}</span>
  }

  return (
    <section ref={sectionRef} className="relative py-32 lg:py-40 bg-black">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-[#74ADFE] text-sm tracking-[0.2em] uppercase font-medium mb-4 block">
            Comparison
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Heliozz vs. Others
          </h2>
        </div>

        {/* Table */}
        <div className={`overflow-hidden border border-gray-800 bg-gray-900/20 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Header */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-900/50 border-b border-gray-800">
            <div className="text-gray-400 font-medium text-sm">Aspect</div>
            <div className="text-[#74ADFE] font-semibold text-center text-sm">Heliozz</div>
            <div className="text-gray-400 font-medium text-center text-sm">Others</div>
          </div>

          {/* Rows */}
          {comparisons.map((item, index) => (
            <div
              key={index}
              className={`grid grid-cols-3 gap-4 p-4 items-center border-b border-gray-800/50 last:border-b-0 hover:bg-gray-900/30 transition-colors`}
            >
              <div className="text-gray-300 text-sm">{item.aspect}</div>
              <div className="flex justify-center">{renderValue(item.heliozz)}</div>
              <div className="flex justify-center">{renderValue(item.others)}</div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </section>
  )
}
