"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Phone, ExternalLink, MoreHorizontal, Maximize2, Minimize2, Loader2, MapPinOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// Dynamically import the map to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import("./resource-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-input">
      <span className="font-mono text-xs text-muted-foreground">Loading map…</span>
    </div>
  ),
})

type ResourceType = "medical" | "police" | "fire" | "pharmacy"

type Resource = {
  id: string
  name: string
  type: ResourceType
  address: string
  distance: number
  travelTime: number
  is24Hours: boolean
  lat: number
  lng: number
  phone?: string
  website?: string
}

// Mock data - positioned around SJSU for demo purposes
const mockResources: Resource[] = [
  {
    id: "1",
    name: "CVS Pharmacy",
    type: "pharmacy",
    address: "140 E San Carlos St, San Jose",
    distance: 0.2,
    travelTime: 1,
    is24Hours: true,
    lat: 37.3335,
    lng: -121.8825,
    phone: "+1-408-294-9134",
    website: "https://cvs.com"
  },
  {
    id: "2",
    name: "Regional Medical Center",
    type: "medical",
    address: "225 N Jackson Ave, San Jose",
    distance: 0.5,
    travelTime: 3,
    is24Hours: true,
    lat: 37.3382,
    lng: -121.8756,
    phone: "+1-408-259-5000",
    website: "https://example.com"
  },
  {
    id: "3",
    name: "SJPD Downtown Substation",
    type: "police",
    address: "201 W Mission St, San Jose",
    distance: 0.6,
    travelTime: 3,
    is24Hours: true,
    lat: 37.3290,
    lng: -121.8892,
    phone: "911",
    website: "https://sjpd.org"
  },
  {
    id: "4",
    name: "Fire Station #1",
    type: "fire",
    address: "225 N Market St, San Jose",
    distance: 0.7,
    travelTime: 4,
    is24Hours: true,
    lat: 37.3398,
    lng: -121.8895,
    phone: "911"
  },
  {
    id: "5",
    name: "Student Health Center",
    type: "medical",
    address: "1 Washington Sq, San Jose",
    distance: 0.1,
    travelTime: 1,
    is24Hours: false,
    lat: 37.3360,
    lng: -121.8820,
    phone: "+1-408-924-6120"
  },
]

// Resource type colors + labels (design.md §2.1). Order matches the legend.
const resourceTypeConfig: Record<ResourceType, { label: string; dot: string }> = {
  medical: { label: "Hospital", dot: "bg-resource-medical" },
  fire: { label: "Fire", dot: "bg-resource-fire" },
  police: { label: "Police", dot: "bg-resource-police" },
  pharmacy: { label: "Pharmacy", dot: "bg-resource-pharmacy" },
}
const RESOURCE_TYPES = Object.keys(resourceTypeConfig) as ResourceType[]

// Demo mode: Hardcoded caller location at San Jose State University
const DEMO_CALLER_LOCATION = {
  lat: 37.3352,
  lng: -121.8811,
  name: "San Jose State University"
}

interface NearbyResourcesProps {
  /** Current call priority (P1–P4); tints the incident pin on the map. */
  priority?: string | null
}

export function NearbyResources({ priority = null }: NearbyResourcesProps) {
  // For demo: Start with SJSU location already set
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(DEMO_CALLER_LOCATION)
  const [locationError, setLocationError] = useState<string | null>(null)
  // Empty set = show all types
  const [selectedTypes, setSelectedTypes] = useState<Set<ResourceType>>(new Set())
  const [isExpanded, setIsExpanded] = useState(false)
  const [locationEnabled, setLocationEnabled] = useState(true) // Default enabled for demo
  const [isLocating, setIsLocating] = useState(false)
  const [pendingLink, setPendingLink] = useState<{ kind: "call" | "website"; name: string; target: string } | null>(null)

  const handleConfirmLink = () => {
    if (!pendingLink) return
    if (pendingLink.kind === "call") {
      window.location.href = `tel:${pendingLink.target}`
    } else {
      window.open(pendingLink.target, "_blank", "noopener,noreferrer")
    }
    setPendingLink(null)
  }

  const handleLocationToggle = (enabled: boolean) => {
    setLocationEnabled(enabled)

    if (enabled) {
      if ("geolocation" in navigator) {
        setIsLocating(true)
        setLocationError(null)

        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
            setLocationError(null)
            setIsLocating(false)
          },
          (error) => {
            setLocationError(
              error.code === 1
                ? "Location permission denied"
                : "Unable to retrieve your location"
            )
            setIsLocating(false)
            setLocationEnabled(false)
          },
          { enableHighAccuracy: true, timeout: 10000 }
        )
      } else {
        setLocationError("Geolocation not supported")
        setLocationEnabled(false)
      }
    } else {
      setUserLocation(null)
      setLocationError(null)
    }
  }

  const toggleType = (type: ResourceType) => {
    setSelectedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const isTypeVisible = (type: ResourceType) => selectedTypes.size === 0 || selectedTypes.has(type)

  const filteredResources = mockResources
    .filter((r) => isTypeVisible(r.type))
    .sort((a, b) => a.distance - b.distance)

  const resourceCounts = Object.fromEntries(
    RESOURCE_TYPES.map((type) => [type, mockResources.filter((r) => r.type === type).length])
  ) as Record<ResourceType, number>

  const locationStatus = isLocating
    ? { text: "Detecting location…", tone: "text-muted-foreground" }
    : locationEnabled && userLocation
      ? { text: `Caller location: ${DEMO_CALLER_LOCATION.name}`, tone: "text-muted-foreground" }
      : locationError
        ? { text: locationError, tone: "text-warning" }
        : { text: "Location sharing off", tone: "text-muted-foreground" }

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle>Nearby resources</CardTitle>
        <CardAction className="gap-1">
          {selectedTypes.size > 0 && (
            <span className="font-mono text-xs text-muted-foreground">
              {selectedTypes.size} filter{selectedTypes.size > 1 ? "s" : ""}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Collapse map" : "Expand map"}
            aria-pressed={isExpanded}
          >
            {isExpanded ? <Minimize2 /> : <Maximize2 />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Map options">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Resource types</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {RESOURCE_TYPES.map((type) => {
                const config = resourceTypeConfig[type]
                return (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={selectedTypes.has(type)}
                    onCheckedChange={() => toggleType(type)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    <span className={cn("size-2 rounded-full", config.dot)} aria-hidden />
                    <span className="flex-1">{config.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">{resourceCounts[type]}</span>
                  </DropdownMenuCheckboxItem>
                )
              })}
              <DropdownMenuItem
                disabled={selectedTypes.size === 0}
                onSelect={() => setSelectedTypes(new Set())}
              >
                Show all
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={locationEnabled}
                disabled={isLocating}
                onCheckedChange={(checked) => handleLocationToggle(checked === true)}
                onSelect={(e) => e.preventDefault()}
              >
                Share caller location
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <div className="grid flex-1 md:grid-cols-2">
        {/* Map + legend */}
        <div className="flex flex-col border-b border-border md:border-r md:border-b-0">
          <div
            className={cn(
              // isolate: keep Leaflet's z-index 400+ panes under the sticky header and menus
              "relative isolate transition-[height] duration-300 motion-reduce:transition-none",
              isExpanded ? "h-[480px]" : "h-[280px]"
            )}
          >
            <MapComponent
              resources={filteredResources}
              userLocation={userLocation}
              priority={priority}
              className="h-full"
            />
          </div>
          <div
            className="flex flex-wrap items-center gap-1 border-t border-border px-3 py-2"
            role="group"
            aria-label="Filter resource types on map"
          >
            {RESOURCE_TYPES.map((type) => {
              const config = resourceTypeConfig[type]
              const active = selectedTypes.has(type)
              const visible = isTypeVisible(type)
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleType(type)}
                  className={cn(
                    "flex h-7 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-colors",
                    active
                      ? "border-primary/50 bg-primary-soft text-foreground"
                      : "border-transparent hover:bg-card-raised",
                    visible ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className={cn("size-2 rounded-full", config.dot, !visible && "opacity-40")} aria-hidden />
                  {config.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Resource list */}
        <div className="flex min-w-0 flex-col px-4 py-3">
          <ul className="divide-y divide-border">
            {filteredResources.map((resource) => {
              const config = resourceTypeConfig[resource.type]
              return (
                <li key={resource.id} className="group relative flex min-h-12 items-center gap-3 py-2">
                  <span className={cn("size-2 shrink-0 rounded-full", config.dot)} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground" title={resource.name}>
                      {resource.name}
                      <span className="sr-only"> ({config.label})</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{resource.address}</p>
                  </div>
                  {/* Actions overlay the distance on hover/focus; always inline on touch screens. */}
                  {(resource.phone || resource.website) && (
                  <div
                    className={cn(
                      "absolute inset-y-0 right-0 flex items-center gap-0.5 bg-card pl-2 opacity-0 transition-opacity",
                      "group-hover:opacity-100 focus-within:opacity-100",
                      "[@media(hover:none)]:static [@media(hover:none)]:order-last [@media(hover:none)]:opacity-100"
                    )}
                  >
                    {resource.phone && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Call ${resource.name}`}
                        onClick={() => setPendingLink({ kind: "call", name: resource.name, target: resource.phone! })}
                      >
                        <Phone />
                      </Button>
                    )}
                    {resource.website && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Visit ${resource.name} website`}
                        onClick={() => setPendingLink({ kind: "website", name: resource.name, target: resource.website! })}
                      >
                        <ExternalLink />
                      </Button>
                    )}
                  </div>
                  )}
                  <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {resource.distance} mi · {resource.travelTime} min
                  </span>
                </li>
              )
            })}
            {filteredResources.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">No resources match these filters</li>
            )}
          </ul>

          <p className={cn("mt-auto flex items-center gap-2 pt-3 text-xs", locationStatus.tone)}>
            {isLocating ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : locationError ? (
              <MapPinOff className="size-3" aria-hidden />
            ) : (
              <span
                className={cn("size-1.5 rounded-full", locationEnabled && userLocation ? "bg-success" : "bg-subtle-foreground")}
                aria-hidden
              />
            )}
            {locationStatus.text}
          </p>
        </div>
      </div>

      <AlertDialog open={pendingLink !== null} onOpenChange={(open) => !open && setPendingLink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingLink?.kind === "call" ? `Call ${pendingLink.name}?` : `Open ${pendingLink?.name} website?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingLink?.kind === "call"
                ? `This will start a call to ${pendingLink.target}.`
                : `This will open ${pendingLink?.target} in a new tab.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLink}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
