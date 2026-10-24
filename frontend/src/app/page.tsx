import { Hero } from "@/components/landing/hero"
import { LandingNav } from "@/components/landing/landing-nav"
import { CtaBand, LandingFooter, MapSection, PipelineSection, PrioritySection } from "@/components/landing/sections"

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <LandingNav />
      <main>
        <Hero />
        <PipelineSection />
        <PrioritySection />
        <MapSection />
        <CtaBand />
      </main>
      <LandingFooter />
    </div>
  )
}
