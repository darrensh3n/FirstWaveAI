import type { Metadata } from "next"
import { Header } from "@/components/header"
import { EmergencyDashboard } from "@/components/emergency-dashboard"

export const metadata: Metadata = {
  title: "Dispatcher console · FirstWave",
}

export default function ConsolePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <EmergencyDashboard />
      </main>
    </div>
  )
}
