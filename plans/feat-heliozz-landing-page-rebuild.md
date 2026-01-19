# feat: Rebuild Heliozz Landing Page from Scratch

## Overview

Complete rebuild of the landing page at `agentic-ai-platform/app/page.tsx` for **Heliozz** - an agentic AI platform for cloud cost optimization. The new landing page will feature a dark theme with black as the primary color, modern typography (Inter + Poppins), subtle abstract textures, and scroll-based GSAP animations.

**Brand Colors:**
- Primary Blue: `#296CF0` (main accent for CTAs)
- Light Blue: `#74ADFE`, `#84B2F7` (gradients, highlights)
- Black: Primary background and text color
- White: Contrast text on dark backgrounds

## Sections to Implement

| # | Section | Description |
|---|---------|-------------|
| 1 | **Hero** | Tagline, headline, description, waitlist CTA |
| 2 | **The Problem** | 4 key challenges with icons and stagger animation |
| 3 | **Analyst Insights** | 4 statistics with counter animations |
| 4 | **Solution** | Platform introduction with visual |
| 5 | **Features & Benefits** | 6-item grid with icons |
| 6 | **Comparison Table** | Heliozz vs Others |
| 7 | **Why Heliozz** | 3 differentiators (AI Engine, Easy Setup, Lower Cost) |
| 8 | **Final CTA** | Waitlist signup + contact link |
| 9 | **Footer** | Minimal footer with branding |

---

## Technical Approach

### Dependencies to Install

```bash
npm install gsap @gsap/react
```

### File Structure

```
agentic-ai-platform/
├── app/
│   ├── page.tsx                    # Landing page (rebuild this)
│   ├── layout.tsx                  # Add Poppins font
│   └── globals.css                 # Update color scheme
├── components/
│   └── landing/
│       ├── hero-section.tsx
│       ├── problems-section.tsx
│       ├── insights-section.tsx
│       ├── solution-section.tsx
│       ├── features-section.tsx
│       ├── comparison-section.tsx
│       ├── differentiators-section.tsx
│       ├── cta-section.tsx
│       └── footer.tsx
├── components/
│   └── animations/
│       ├── gsap-provider.tsx       # GSAP initialization
│       ├── scroll-reveal.tsx       # Reusable scroll animation
│       └── animated-counter.tsx    # Number counter
├── public/
│   └── textures/
│       └── grain.svg               # Subtle noise texture
└── tailwind.config.ts              # Add brand colors
```

---

## Implementation Details

### Phase 1: Foundation Setup

#### 1.1 Install GSAP

```bash
cd agentic-ai-platform && npm install gsap @gsap/react
```

#### 1.2 Update `tailwind.config.ts`

Add Heliozz brand colors:

```typescript
// tailwind.config.ts
extend: {
  colors: {
    // Heliozz brand colors
    heliozz: {
      blue: {
        light: '#84B2F7',
        DEFAULT: '#74ADFE',
        dark: '#296CF0',
      },
    },
    // ... existing colors
  },
  fontFamily: {
    sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
    heading: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
  },
}
```

#### 1.3 Update `app/layout.tsx`

Add Poppins font:

```typescript
// app/layout.tsx
import { Inter, Poppins } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
})

const poppins = Poppins({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
})

// In html tag:
<html lang="en" className={`${inter.variable} ${poppins.variable}`}>
```

#### 1.4 Update `app/globals.css`

Dark theme with Heliozz colors:

```css
/* globals.css */
:root {
  --background: 0 0% 0%;           /* Black */
  --foreground: 0 0% 100%;         /* White */
  --primary: 220 89% 55%;          /* #296CF0 */
  --primary-light: 217 98% 73%;    /* #74ADFE */
  --primary-lighter: 218 90% 75%;  /* #84B2F7 */
  /* ... */
}

/* Subtle grain texture overlay */
.texture-overlay {
  background-image: url('/textures/grain.svg');
  opacity: 0.03;
  pointer-events: none;
}
```

#### 1.5 Create GSAP Provider

```typescript
// components/animations/gsap-provider.tsx
'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
}

export function GSAPProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ScrollTrigger.config({
      limitCallbacks: true,
      ignoreMobileResize: true,
    })
    return () => ScrollTrigger.killAll()
  }, [])

  return <>{children}</>
}
```

---

### Phase 2: Section Components

#### 2.1 Hero Section (`components/landing/hero-section.tsx`)

**Content:**
- Tagline: "Cost Optimization Autopilot"
- H1: "Agentic AI platform to optimize your cloud infrastructure costs"
- Description: Brief value prop with 20% savings highlight
- CTA: "Join the Waitlist" button (gradient blue)

**Animation:**
- Text slides up with stagger
- CTA button bounces in with `back.out` easing
- Subtle parallax on background texture

```typescript
// components/landing/hero-section.tsx
'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.from('.hero-tagline', { y: 40, opacity: 0, duration: 0.8 })
        .from('.hero-title', { y: 60, opacity: 0, duration: 1 }, '-=0.5')
        .from('.hero-description', { y: 40, opacity: 0, duration: 0.8 }, '-=0.6')
        .from('.hero-cta', { y: 30, opacity: 0, scale: 0.95, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.4')
    })

    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set('.hero-tagline, .hero-title, .hero-description, .hero-cta', { opacity: 1 })
    })
  }, { scope: heroRef })

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center pt-20">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-heliozz-blue-dark/10" />

      {/* Texture overlay */}
      <div className="absolute inset-0 texture-overlay" />

      {/* Gradient orb */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-heliozz-blue-dark/20 rounded-full blur-[120px]" />

      <div className="relative z-10 container max-w-4xl text-center">
        <p className="hero-tagline text-heliozz-blue font-medium mb-6">
          Cost Optimization Autopilot
        </p>

        <h1 className="hero-title font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
          Agentic AI platform to optimize your{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-heliozz-blue-light to-heliozz-blue-dark">
            cloud infrastructure costs
          </span>
        </h1>

        <p className="hero-description text-xl text-gray-400 mt-8 max-w-2xl mx-auto">
          Identify inefficiencies, automate optimization workflows, and provide continuous insights
          to keep cloud costs under control – delivering an average of{' '}
          <span className="text-heliozz-blue font-semibold">20% savings</span> for your business.
        </p>

        <div className="hero-cta mt-12">
          <Link href="#waitlist">
            <Button
              size="lg"
              className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-heliozz-blue to-heliozz-blue-dark hover:from-heliozz-blue-light hover:to-heliozz-blue"
            >
              Join the Waitlist
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
```

#### 2.2 Problems Section (`components/landing/problems-section.tsx`)

**Content:**
4 challenges with icons:
1. Costs Keep Rising (TrendingUp icon)
2. Manual Work Required (Hand icon)
3. Skill Gaps & Complexity (Puzzle icon)
4. Missed Financial Incentives (CircleDollarSign icon)

**Animation:**
- Section title fades in
- Cards stagger in from bottom (0.15s delay each)
- Icons have subtle scale animation on scroll

```typescript
// components/landing/problems-section.tsx
'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { TrendingUp, Hand, Puzzle, CircleDollarSign } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const challenges = [
  {
    icon: TrendingUp,
    title: 'Costs Keep Rising',
    description: 'With limited visibility and resources scattered across multiple clouds, organizations struggle to manage and contain spending effectively.',
  },
  {
    icon: Hand,
    title: 'Manual Work Required',
    description: 'Analyzing cost dashboards and executing optimizations manually is time-consuming and prone to human error, leading to missed savings opportunities.',
  },
  {
    icon: Puzzle,
    title: 'Skill Gaps & Complexity',
    description: "Optimizing cloud costs is complex. Without the right expertise on the team, it's challenging to identify and implement the best cost-saving measures.",
  },
  {
    icon: CircleDollarSign,
    title: 'Missed Financial Incentives',
    description: 'Teams often fail to leverage optimal pricing models, discounts, and commitments offered by cloud providers, resulting in unnecessary overspending.',
  },
]

export function ProblemsSection() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.from('.challenge-card', {
      y: 80,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      stagger: 0.15,
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    })
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="py-24 bg-black">
      <div className="container">
        <h2 className="font-heading text-4xl font-bold text-white text-center mb-4">
          Key Challenges
        </h2>
        <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
          Modern organizations face several pain points in cloud cost management
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {challenges.map((challenge, index) => (
            <div
              key={index}
              className="challenge-card p-8 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-heliozz-blue/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-heliozz-blue/10 flex items-center justify-center mb-6">
                <challenge.icon className="w-6 h-6 text-heliozz-blue" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-white mb-3">
                {challenge.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {challenge.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

#### 2.3 Insights Section (`components/landing/insights-section.tsx`)

**Content:**
4 statistics from analyst reports:
- BCG: 30%+ cloud budgets wasted
- CNCF: 70% over-provisioning
- Azul: 83% CIOs overspending
- 2Data: 32% cloud spend wasted

**Animation:**
- Numbers count up from 0 on scroll
- Source names fade in after numbers

```typescript
// components/animations/animated-counter.tsx
'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

interface AnimatedCounterProps {
  end: number
  suffix?: string
  duration?: number
}

export function AnimatedCounter({ end, suffix = '', duration = 2 }: AnimatedCounterProps) {
  const counterRef = useRef<HTMLSpanElement>(null)

  useGSAP(() => {
    const obj = { value: 0 }

    gsap.to(obj, {
      value: end,
      duration,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: counterRef.current,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      onUpdate: () => {
        if (counterRef.current) {
          counterRef.current.textContent = Math.round(obj.value) + suffix
        }
      },
    })
  }, { scope: counterRef })

  return <span ref={counterRef} className="tabular-nums">0{suffix}</span>
}
```

```typescript
// components/landing/insights-section.tsx
'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { AnimatedCounter } from '@/components/animations/animated-counter'

gsap.registerPlugin(ScrollTrigger)

const insights = [
  { value: 30, suffix: '%+', source: 'BCG (2025)', description: 'of cloud budgets wasted on idle resources' },
  { value: 70, suffix: '%', source: 'CNCF (2025)', description: 'cite over-provisioning as primary waste factor' },
  { value: 83, suffix: '%', source: 'Azul (2025)', description: 'of CIOs spending more than anticipated' },
  { value: 32, suffix: '%', source: '2Data (2025)', description: 'of cloud spend is ultimately wasted' },
]

export function InsightsSection() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.from('.insight-card', {
      y: 60,
      opacity: 0,
      duration: 0.6,
      stagger: 0.15,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 75%',
      },
    })
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="py-24 bg-gradient-to-b from-black to-gray-950">
      <div className="container">
        <h2 className="font-heading text-4xl font-bold text-white text-center mb-4">
          Analyst Insights
        </h2>
        <p className="text-gray-400 text-center mb-16">
          Surveys confirm these challenges
        </p>

        <div className="grid md:grid-cols-4 gap-8">
          {insights.map((insight, index) => (
            <div key={index} className="insight-card text-center">
              <div className="text-5xl font-bold text-heliozz-blue mb-2">
                <AnimatedCounter end={insight.value} suffix={insight.suffix} />
              </div>
              <p className="text-gray-400 text-sm mb-2">{insight.description}</p>
              <p className="text-gray-500 text-xs">{insight.source}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

#### 2.4 Solution Section (`components/landing/solution-section.tsx`)

**Content:**
- Platform introduction paragraph
- Supported providers: AWS, Azure, GCP
- Optional visual/illustration

**Animation:**
- Text slides up
- Provider logos fade in with stagger

#### 2.5 Features Section (`components/landing/features-section.tsx`)

**Content:**
6 features in a 2x3 or 3x2 grid:
1. Setup in Minutes (Zap icon)
2. Proactive Notifications (Bell icon)
3. Multi-Cloud Support (Cloud icon)
4. End-to-End Automation (Cog icon)
5. Agentic AI Engine (Bot icon)
6. Advanced Insights (BarChart icon)

**Animation:**
- Cards stagger in from center outward
- Icons scale up on reveal

#### 2.6 Comparison Section (`components/landing/comparison-section.tsx`)

**Content:**
Table comparing Heliozz vs Others:
| Aspect | Heliozz | Others |
|--------|---------|--------|
| AI-Native | Yes | No |
| Cost | Low | High |
| Execution | Automatic | Manual |
| Architecture-Aware | Yes | No |
| Setup | Easy | Difficult |

**Animation:**
- Table rows fade in sequentially
- Checkmarks/X animate with scale

#### 2.7 Differentiators Section (`components/landing/differentiators-section.tsx`)

**Content:**
3 columns highlighting:
1. **Agentic AI Engine** - Modern, adaptive platform
2. **Easy Setup** - Minutes to deploy, Day 1 value
3. **Lower Cost** - 1/3 the cost of competitors

**Animation:**
- Cards flip or zoom in on scroll
- Keywords highlighted with gradient

#### 2.8 CTA Section (`components/landing/cta-section.tsx`)

**Content:**
- Question: "Are you ready to optimize your cloud costs?"
- Value recap
- Primary CTA: "Join the Waitlist"
- Secondary: "Contact Us" link

**Animation:**
- Text fades in
- Button pulses subtly

#### 2.9 Footer (`components/landing/footer.tsx`)

**Content:**
- Heliozz logo
- Copyright
- Minimal links

---

### Phase 3: Main Page Assembly

```typescript
// app/page.tsx
import { GSAPProvider } from '@/components/animations/gsap-provider'
import { HeroSection } from '@/components/landing/hero-section'
import { ProblemsSection } from '@/components/landing/problems-section'
import { InsightsSection } from '@/components/landing/insights-section'
import { SolutionSection } from '@/components/landing/solution-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { ComparisonSection } from '@/components/landing/comparison-section'
import { DifferentiatorsSection } from '@/components/landing/differentiators-section'
import { CTASection } from '@/components/landing/cta-section'
import { LandingFooter } from '@/components/landing/footer'

export const metadata = {
  title: 'Heliozz - Cost Optimization Autopilot',
  description: 'Agentic AI platform to optimize your cloud infrastructure costs. Deliver 20% average savings with AI-powered automation.',
}

export default function LandingPage() {
  return (
    <GSAPProvider>
      <main className="bg-black min-h-screen">
        <HeroSection />
        <ProblemsSection />
        <InsightsSection />
        <SolutionSection />
        <FeaturesSection />
        <ComparisonSection />
        <DifferentiatorsSection />
        <CTASection />
        <LandingFooter />
      </main>
    </GSAPProvider>
  )
}
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] Hero section displays with correct content and CTA
- [ ] All 8 sections render in correct order
- [ ] Animations trigger on scroll (not on page load except hero)
- [ ] Counter animations work for statistics
- [ ] All CTAs link to waitlist/contact appropriately
- [ ] Page is fully responsive (mobile, tablet, desktop)

### Design Requirements

- [ ] Black background throughout with subtle gradient variations
- [ ] Brand colors (#74ADFE, #84B2F7, #296CF0) used consistently
- [ ] Poppins font for headings, Inter for body
- [ ] Subtle grain/noise texture visible in hero
- [ ] Smooth 300-500ms animation durations
- [ ] Animations respect `prefers-reduced-motion`

### Technical Requirements

- [ ] GSAP installed and properly initialized
- [ ] No layout shift on animation triggers
- [ ] Lighthouse performance score > 90
- [ ] No console errors
- [ ] TypeScript types correct

---

## Files to Create/Modify

### New Files

| File | Description |
|------|-------------|
| `components/animations/gsap-provider.tsx` | GSAP initialization and cleanup |
| `components/animations/scroll-reveal.tsx` | Reusable scroll animation wrapper |
| `components/animations/animated-counter.tsx` | Number counter component |
| `components/landing/hero-section.tsx` | Hero section |
| `components/landing/problems-section.tsx` | Key challenges section |
| `components/landing/insights-section.tsx` | Statistics section |
| `components/landing/solution-section.tsx` | Platform intro section |
| `components/landing/features-section.tsx` | Feature grid section |
| `components/landing/comparison-section.tsx` | Comparison table section |
| `components/landing/differentiators-section.tsx` | Why Heliozz section |
| `components/landing/cta-section.tsx` | Final CTA section |
| `components/landing/footer.tsx` | Footer component |
| `public/textures/grain.svg` | Noise texture SVG |

### Files to Modify

| File | Changes |
|------|---------|
| `app/page.tsx` | Complete rebuild with new sections |
| `app/layout.tsx` | Add Poppins font |
| `app/globals.css` | Update color scheme for dark theme |
| `tailwind.config.ts` | Add Heliozz colors and font families |
| `package.json` | Add gsap, @gsap/react dependencies |

---

## Risk Considerations

1. **GSAP SSR**: Must use `'use client'` directive on all animation components
2. **ScrollTrigger Cleanup**: Ensure proper cleanup on unmount to prevent memory leaks
3. **Animation Performance**: Keep transforms to `opacity` and `transform` only
4. **Accessibility**: Must implement `prefers-reduced-motion` checks
5. **Existing Routes**: Do NOT modify `/login`, `/onboarding`, `/dashboard`, etc.

---

## References

### Internal Files
- `agentic-ai-platform/app/page.tsx` - Current landing page to replace
- `agentic-ai-platform/components/ui/button.tsx` - Existing Button component
- `agentic-ai-platform/app/globals.css` - Current global styles
- `agentic-ai-platform/tailwind.config.ts` - Current Tailwind config

### External Resources
- [GSAP React Basics](https://gsap.com/resources/react-basics)
- [GSAP ScrollTrigger Docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- [GSAP Accessibility Guide](https://gsap.com/resources/a11y/)
- [Next.js Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
