import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { Pillars } from '@/components/landing/sections/pillars'
import { Deployments } from '@/components/landing/sections/deployments'
import { Seeloudfn } from '@/components/landing/sections/seeloudfn'
import { Seeloudcron } from '@/components/landing/sections/seeloudcron'
import { DxStrip } from '@/components/landing/sections/dx-strip'
import { ResourcesStrip } from '@/components/landing/sections/resources-strip'
import { Pricing } from '@/components/landing/sections/pricing'
import { FinalCta } from '@/components/landing/sections/final-cta'
import { Footer } from '@/components/landing/sections/footer'

export default function LandingPage() {
  return (
    <div className="landing-theme min-h-screen">
      <Navbar />
      <main id="main">
        <Hero />
        <Pillars />
        <Deployments />
        <Seeloudfn />
        <Seeloudcron />
        <DxStrip />
        <ResourcesStrip />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
