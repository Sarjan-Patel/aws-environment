"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function FloatingNavbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out",
        scrolled ? "py-3" : "py-5"
      )}
    >
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "flex items-center justify-between px-4 sm:px-6 py-3 transition-all duration-500",
            // Sharp glass effect
            "bg-white/[0.06] backdrop-blur-2xl",
            "border border-white/[0.1]",
            "shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
            scrolled && "bg-white/[0.1] shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
          )}
        >
          {/* Logo */}
          <div className="flex items-center">
            <span className="font-heading font-bold text-white text-2xl tracking-tight">
              Heliozz
            </span>
          </div>

          {/* Right side - Navigation + CTA */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => scrollToSection("about")}
              className="px-3 sm:px-4 py-2 text-sm font-medium transition-colors duration-200 text-white/70 hover:text-white"
            >
              About
            </button>

            <button
              onClick={() => scrollToSection("contact")}
              className="px-3 sm:px-4 py-2 text-sm font-medium transition-colors duration-200 text-white/70 hover:text-white"
            >
              Contact Us
            </button>

            <Link
              href="/login"
              className={cn(
                "px-5 sm:px-6 py-2.5 text-sm font-semibold transition-all duration-300",
                "bg-white text-black",
                "hover:bg-[#74ADFE] hover:text-white",
                "active:scale-[0.98]"
              )}
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
