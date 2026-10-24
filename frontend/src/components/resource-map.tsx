"use client"

import { useEffect, useMemo } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Lucide glyph paths (Cross, Flame, Shield, Pill) inlined so markers can be
// plain divIcon HTML without rendering React to a string.
const GLYPHS: Record<string, string> = {
  medical:
    '<path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/>',
  fire: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  police:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  pharmacy:
    '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
}

const RESOURCE_TYPES = new Set(["medical", "fire", "police", "pharmacy"])

// 20px filled circle in the resource-type color, 2px card stroke, white 11px glyph (design.md §5).
const resourceIconCache = new Map<string, L.DivIcon>()
function getResourceIcon(type: string) {
  const cached = resourceIconCache.get(type)
  if (cached) return cached
  const color = RESOURCE_TYPES.has(type) ? `var(--resource-${type})` : "var(--muted-foreground)"
  const icon = L.divIcon({
    className: "fw-marker",
    html: `
      <span class="fw-marker__dot" style="background:${color}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPHS[type] ?? ""}</svg>
      </span>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  })
  resourceIconCache.set(type, icon)
  return icon
}

// Incident / caller: dot + two concentric rings in the current call's priority color
// (foreground white before triage). Outer ring pulses; reduce-motion rules live in globals.css.
function createIncidentIcon(priority: string | null | undefined) {
  const key = priority?.toLowerCase()
  const color = key && ["p1", "p2", "p3", "p4"].includes(key) ? `var(--${key})` : "var(--foreground)"
  return L.divIcon({
    className: "fw-marker",
    html: `
      <span class="fw-incident" style="--fw-incident:${color}">
        <span class="fw-incident__ring fw-incident__ring--outer animate-wave-ring"></span>
        <span class="fw-incident__ring"></span>
        <span class="fw-incident__dot"></span>
      </span>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -14],
  })
}

type Resource = {
  id: string
  name: string
  type: string
  lat: number
  lng: number
  address?: string
}

type Props = {
  resources: Resource[]
  userLocation: { lat: number; lng: number } | null
  /** Current call priority (P1–P4) used to tint the incident pin. */
  priority?: string | null
  className?: string
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, 14)
  }, [center, map])
  return null
}

/** Leaflet needs a nudge when its container height changes (expand/collapse). */
function SizeWatcher() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])
  return null
}

export default function ResourceMap({ resources, userLocation, priority, className = "" }: Props) {
  const lat = userLocation?.lat ?? 37.3352 // San Jose State University (demo default)
  const lng = userLocation?.lng ?? -121.8811
  const center = useMemo<[number, number]>(() => [lat, lng], [lat, lng])
  const incidentIcon = useMemo(() => createIncidentIcon(priority), [priority])

  return (
    // fw-map: OSM tiles are darkened with a CSS filter in globals.css (design.md §5, option 2).
    <MapContainer center={center} zoom={14} className={`fw-map w-full ${className}`}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} />
      <SizeWatcher />

      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={incidentIcon} zIndexOffset={1000}>
          <Popup>
            <span className="font-semibold">Caller location</span>
            <br />
            <span className="text-xs text-muted-foreground">San Jose State University</span>
          </Popup>
        </Marker>
      )}

      {resources.map((resource) => (
        <Marker key={resource.id} position={[resource.lat, resource.lng]} icon={getResourceIcon(resource.type)}>
          <Popup>
            <span className="font-semibold">{resource.name}</span>
            {resource.address && (
              <>
                <br />
                <span className="text-xs text-muted-foreground">{resource.address}</span>
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
