"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  FilterChip,
  NativeSelect,
  RangeSlider,
  SettingRow,
  SettingsSection,
  SwatchGroup,
  SwitchRow,
} from "./settings-controls"
import { SettingsNav, type SettingsNavItem } from "./settings-nav"

/* Visual-only settings form. All values live in local state and reset on reload.
   TODO: replace with `useSettings()` from `src/lib/settings.tsx` (SettingsProvider,
   localStorage `firstwave.settings`, backend URL validation) per design.md §4.3. */

const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

type ResourceType = "medical" | "fire" | "police" | "pharmacy"
type Accent = "wave" | "indigo" | "amber" | "mint"

type SettingsState = {
  ttsEnabled: boolean
  liveTranscription: boolean
  recognitionLang: string
  suggestFollowUps: boolean
  showAgentPipeline: boolean
  searchRadiusMi: number
  mapTypes: Record<ResourceType, boolean>
  accent: Accent
  reduceMotion: boolean
  backendUrl: string
}

const DEFAULTS: SettingsState = {
  ttsEnabled: true,
  liveTranscription: true,
  recognitionLang: "en-US",
  suggestFollowUps: true,
  showAgentPipeline: true,
  searchRadiusMi: 5,
  mapTypes: { medical: true, fire: true, police: true, pharmacy: true },
  accent: "wave",
  reduceMotion: false,
  backendUrl: DEFAULT_BACKEND_URL,
}

const NAV_ITEMS: SettingsNavItem[] = [
  { id: "voice", label: "Voice" },
  { id: "dispatch", label: "Dispatch" },
  { id: "map", label: "Map" },
  { id: "appearance", label: "Appearance" },
  { id: "connection", label: "Connection" },
]

const LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-US", label: "Spanish (US)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
  { value: "zh-CN", label: "Chinese (Mandarin)" },
  { value: "vi-VN", label: "Vietnamese" },
]

const MAP_TYPES: { value: ResourceType; label: string; dot: string }[] = [
  { value: "medical", label: "Hospitals", dot: "bg-resource-medical" },
  { value: "fire", label: "Fire stations", dot: "bg-resource-fire" },
  { value: "police", label: "Police", dot: "bg-resource-police" },
  { value: "pharmacy", label: "Pharmacies", dot: "bg-resource-pharmacy" },
]

// Fixed swatch colors: `--primary` itself changes with the accent, so it can't be used here.
const ACCENTS: { value: Accent; label: string; color: string }[] = [
  { value: "wave", label: "Wave", color: "#38d4f2" },
  { value: "indigo", label: "Indigo", color: "#8b8cf8" },
  { value: "amber", label: "Amber", color: "var(--warning)" },
  { value: "mint", label: "Mint", color: "var(--success)" },
]

type HealthStatus = "checking" | "online" | "offline"

/** One-off read-only /health check of the build-time backend, so the pill isn't fake. */
function useBackendHealth(url: string): HealthStatus {
  const [status, setStatus] = useState<HealthStatus>("checking")
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${url}/health`, { cache: "no-store", signal: controller.signal })
      .then((res) => setStatus(res.ok ? "online" : "offline"))
      .catch(() => {
        if (!controller.signal.aborted) setStatus("offline")
      })
    return () => controller.abort()
  }, [url])
  return status
}

const HEALTH_LABEL: Record<HealthStatus, string> = { checking: "Checking", online: "Online", offline: "Offline" }

export function SettingsForm() {
  const [s, setS] = useState<SettingsState>(DEFAULTS)
  const set = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) =>
    setS((prev) => ({ ...prev, [key]: value }))

  const health = useBackendHealth(DEFAULT_BACKEND_URL)

  return (
    <div className="mt-6 grid gap-6 md:mt-8 md:grid-cols-[160px_minmax(0,1fr)] md:gap-6">
      <SettingsNav items={NAV_ITEMS} />

      <div className="flex min-w-0 flex-col gap-4">
        <SettingsSection id="voice" title="Voice">
          <SwitchRow
            id="tts-enabled"
            label="Spoken replies"
            description="FirstWave reads its questions to the caller aloud."
            checked={s.ttsEnabled}
            onCheckedChange={(v) => set("ttsEnabled", v)}
          />
          <SwitchRow
            id="live-transcription"
            label="Live transcription"
            description="Transcribe the caller as they speak."
            checked={s.liveTranscription}
            onCheckedChange={(v) => set("liveTranscription", v)}
          />
          <SettingRow label="Recognition language" htmlFor="recognition-lang">
            <NativeSelect
              id="recognition-lang"
              className="w-44"
              value={s.recognitionLang}
              onChange={(e) => set("recognitionLang", e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </NativeSelect>
          </SettingRow>
        </SettingsSection>

        <SettingsSection id="dispatch" title="Dispatch">
          <SwitchRow
            id="human-approval"
            label="Human approval required"
            description="Always on. A dispatcher approves every recommendation."
            checked
            locked
          />
          <SwitchRow
            id="suggest-followups"
            label="Suggest follow-up questions"
            description="Show the next question for the caller."
            checked={s.suggestFollowUps}
            onCheckedChange={(v) => set("suggestFollowUps", v)}
          />
          <SwitchRow
            id="show-agent-pipeline"
            label="Show agent pipeline"
            description="Display each agent's progress during a call."
            checked={s.showAgentPipeline}
            onCheckedChange={(v) => set("showAgentPipeline", v)}
          />
        </SettingsSection>

        <SettingsSection id="map" title="Map">
          <div className="py-3.5">
            <div className="flex items-center justify-between">
              <label htmlFor="search-radius" className="text-sm font-medium text-foreground">
                Search radius
              </label>
              <output htmlFor="search-radius" className="font-mono text-[13px] text-primary">
                {s.searchRadiusMi} mi
              </output>
            </div>
            <RangeSlider
              id="search-radius"
              className="mt-3"
              min={1}
              max={25}
              value={s.searchRadiusMi}
              onValueChange={(v) => set("searchRadiusMi", v)}
              aria-valuetext={`${s.searchRadiusMi} ${s.searchRadiusMi === 1 ? "mile" : "miles"}`}
            />
          </div>
          <div className="pb-1 pt-2">
            <span id="map-types-label" className="block text-sm font-medium text-foreground">
              Show on map
            </span>
            <div role="group" aria-labelledby="map-types-label" className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MAP_TYPES.map((type) => (
                <FilterChip
                  key={type.value}
                  selected={s.mapTypes[type.value]}
                  dotClassName={type.dot}
                  onClick={() => set("mapTypes", { ...s.mapTypes, [type.value]: !s.mapTypes[type.value] })}
                >
                  {type.label}
                </FilterChip>
              ))}
            </div>
          </div>
        </SettingsSection>

        <SettingsSection id="appearance" title="Appearance">
          <div className="border-b border-border py-3.5">
            <SwatchGroup
              label="Accent color"
              labelId="accent-label"
              options={ACCENTS}
              value={s.accent}
              onValueChange={(v) => set("accent", v)}
            />
          </div>
          <SwitchRow
            id="reduce-motion"
            label="Reduce motion"
            description="Turn off pulsing indicators."
            checked={s.reduceMotion}
            onCheckedChange={(v) => set("reduceMotion", v)}
          />
        </SettingsSection>

        <SettingsSection id="connection" title="Connection">
          <div className="pb-1 pt-3.5">
            <label htmlFor="backend-url" className="block text-sm font-medium text-foreground">
              Backend URL
            </label>
            <div className="mt-2.5 flex items-center gap-2">
              <Input
                id="backend-url"
                type="url"
                inputMode="url"
                spellCheck={false}
                autoComplete="off"
                className="font-mono text-[13px]"
                value={s.backendUrl}
                onChange={(e) => set("backendUrl", e.target.value)}
              />
              <div
                role="status"
                className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-card-raised px-4 text-[13px] font-semibold"
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    health === "online" && "bg-success animate-pulse-dot",
                    health === "offline" && "bg-danger",
                    health === "checking" && "bg-muted-foreground"
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    health === "online" && "text-foreground",
                    health === "offline" && "text-danger",
                    health === "checking" && "text-muted-foreground"
                  )}
                >
                  <span className="sr-only">Backend status: </span>
                  {HEALTH_LABEL[health]}
                </span>
              </div>
            </div>
          </div>
        </SettingsSection>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setS(DEFAULTS)}
            className="rounded-tile px-2 py-1 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  )
}
