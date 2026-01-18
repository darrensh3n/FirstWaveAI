"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { 
  MapPin, 
  Phone, 
  ExternalLink, 
  Flame, 
  Building2, 
  Shield, 
  Cross,
  Filter,
  Navigation,
  ChevronDown,
  Car,
  MapPinOff,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

// Dynamically import the map to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import("./resource-map"), { 
  ssr: false,
  loading: () => (
    <div className="h-48 bg-secondary/50 rounded-lg flex flex-col items-center justify-center gap-2">
      <MapPin className="w-8 h-8 text-muted-foreground/50" />
      <span className="text-muted-foreground text-sm">Map Component Area</span>
      <span className="text-muted-foreground/70 text-xs">Loading map...</span>
    </div>
  )
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

const resourceTypeConfig = {
  medical: { 
    icon: Cross, 
    color: "text-rose-500", 
    bg: "bg-rose-500/20",
    activeBg: "bg-rose-500/30"
  },
  police: { 
    icon: Shield, 
    color: "text-sky-500", 
    bg: "bg-sky-500/20",
    activeBg: "bg-sky-500/30"
  },
  fire: { 
    icon: Flame, 
    color: "text-orange-500", 
    bg: "bg-orange-500/20",
    activeBg: "bg-orange-500/30"
  },
  pharmacy: { 
    icon: Building2, 
    color: "text-emerald-500", 
    bg: "bg-emerald-500/20",
    activeBg: "bg-emerald-500/30"
  },
}

// Demo mode: Hardcoded caller location at San Jose State University
const DEMO_CALLER_LOCATION = {
  lat: 37.3352,
  lng: -121.8811,
  name: "San Jose State University"
}

export function NearbyResources() {
  // For demo: Start with SJSU location already set
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(DEMO_CALLER_LOCATION)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<ResourceType | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [locationEnabled, setLocationEnabled] = useState(true) // Default enabled for demo
  const [isLocating, setIsLocating] = useState(false)

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

  const filteredResources = selectedFilter 
    ? mockResources.filter(r => r.type === selectedFilter)
    : mockResources

  const resourceCounts = {
    medical: mockResources.filter(r => r.type === "medical").length,
    police: mockResources.filter(r => r.type === "police").length,
    fire: mockResources.filter(r => r.type === "fire").length,
    pharmacy: mockResources.filter(r => r.type === "pharmacy").length,
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Nearby Resources</h3>
            <p className="text-sm text-muted-foreground">Emergency services in your area</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
            <ChevronDown className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <Navigation className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Location Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLocating ? (
              <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
            ) : locationEnabled && userLocation ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : locationError ? (
              <MapPinOff className="w-4 h-4 text-amber-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
            )}
            <span className={`text-sm ${
              isLocating 
                ? 'text-emerald-500' 
                : locationEnabled && userLocation 
                  ? 'text-emerald-500' 
                  : locationError 
                    ? 'text-amber-500' 
                    : 'text-muted-foreground'
            }`}>
              {isLocating 
                ? 'Detecting location...' 
                : locationEnabled && userLocation 
                  ? `Caller location: ${DEMO_CALLER_LOCATION.name}` 
                  : locationError 
                    ? locationError 
                    : 'Share your location for nearby results'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Share location</span>
            <Switch
              checked={locationEnabled}
              onCheckedChange={handleLocationToggle}
              disabled={isLocating}
              aria-label="Toggle location sharing"
            />
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(resourceCounts) as ResourceType[]).map((type) => {
            const config = resourceTypeConfig[type]
            const Icon = config.icon
            const isActive = selectedFilter === type
            return (
              <button
                key={type}
                onClick={() => setSelectedFilter(isActive ? null : type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? `${config.activeBg} ${config.color} ring-1 ring-current` 
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {resourceCounts[type]}
              </button>
            )
          })}
        </div>

        {/* Map */}
        <div className="relative">
          <MapComponent 
            resources={filteredResources} 
            userLocation={userLocation}
            className={`transition-all duration-300 ${isExpanded ? "h-96" : "h-48"}`}
          />
          <Button 
            variant="secondary" 
            size="sm" 
            className="absolute bottom-3 right-3 shadow-lg"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>

      {/* Resource List */}
      <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
        {filteredResources.map((resource) => {
          const config = resourceTypeConfig[resource.type]
          const Icon = config.icon
          return (
            <div 
              key={resource.id} 
              className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{resource.name}</span>
                    {resource.is24Hours && (
                      <span className="text-xs px-1.5 py-0.5 rounded border border-emerald-500/50 text-emerald-500 font-medium">
                        24h
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{resource.address}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {resource.distance} mi
                    </span>
                    <span className="flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      {resource.travelTime} min
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {resource.phone && (
                  <Button variant="ghost" size="icon" className="w-9 h-9" asChild>
                    <a href={`tel:${resource.phone}`} aria-label={`Call ${resource.name}`}>
                      <Phone className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                {resource.website && (
                  <Button variant="ghost" size="icon" className="w-9 h-9" asChild>
                    <a 
                      href={resource.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      aria-label={`Visit ${resource.name} website`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
