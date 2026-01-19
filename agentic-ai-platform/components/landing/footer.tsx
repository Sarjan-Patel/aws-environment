'use client'

import { Cloud } from 'lucide-react'

export function LandingFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="py-12 bg-black border-t border-gray-900">
      <div className="container max-w-6xl px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#296CF0] to-[#74ADFE] flex items-center justify-center shadow-md">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold text-xl text-white">Heliozz</span>
          </div>

          {/* Tagline */}
          <p className="text-gray-500 text-sm text-center">
            Agentic AI for Cloud Cost Optimization
          </p>

          {/* Copyright */}
          <p className="text-gray-600 text-sm">
            &copy; {currentYear} Heliozz. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
