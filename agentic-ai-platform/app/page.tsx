import { GSAPProvider } from '@/components/animations/gsap-provider'
import { FloatingNavbar } from '@/components/landing/floating-navbar'
import { HeroSection } from '@/components/landing/hero-section'
import { AboutSection } from '@/components/landing/about-section'
import { ProblemsSection } from '@/components/landing/problems-section'
import { InsightsSection } from '@/components/landing/insights-section'
import { SolutionSection } from '@/components/landing/solution-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { ComparisonSection } from '@/components/landing/comparison-section'
import { DifferentiatorsSection } from '@/components/landing/differentiators-section'
import { FinalSection } from '@/components/landing/final-section'

// Force dynamic rendering to avoid build-time errors
export const dynamic = 'force-dynamic'

export default function LandingPage() {
  return (
    <GSAPProvider>
      <main className="bg-black min-h-screen">
        <FloatingNavbar />
        <HeroSection />
        <AboutSection />
        <ProblemsSection />
        <InsightsSection />
        <SolutionSection />
        <FeaturesSection />
        <ComparisonSection />
        <DifferentiatorsSection />
        <FinalSection />
      </main>
    </GSAPProvider>
  )
}
