import { Header } from "@/components/header"
import { EmergencyDashboard } from "@/components/emergency-dashboard"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <EmergencyDashboard />
    </main>
  )
}
