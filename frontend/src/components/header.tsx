import { Activity, Radio, Shield } from "lucide-react"

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-card animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                FirstWave<span className="text-primary">AI</span>
              </h1>
              <p className="text-xs text-muted-foreground">Emergency Response System</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <Radio className="w-4 h-4 text-success" />
              <span>System Online</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Active</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
