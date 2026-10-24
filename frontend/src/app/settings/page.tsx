import type { Metadata } from "next"
import { SettingsHeader } from "@/components/settings/settings-header"
import { SettingsForm } from "@/components/settings/settings-form"

export const metadata: Metadata = {
  title: "Settings · FirstWave",
}

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SettingsHeader />
      <main className="mx-auto max-w-[960px] px-4 pb-24 pt-10 sm:px-6">
        <h1 className="text-[28px] leading-tight tracking-[-0.01em]">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tune how FirstWave listens, speaks and looks.</p>
        <SettingsForm />
      </main>
    </div>
  )
}
