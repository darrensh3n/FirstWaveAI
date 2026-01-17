"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix for default marker icons in webpack/Next.js builds
const createIcon = (color: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24c0-8.836-7.164-16-16-16z" fill="${color}"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40]
  })
}

const userIcon = L.divIcon({
  className: "user-marker",
  html: `
    <div style="
      width: 16px;
      height: 16px;
      background: #10b981;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8]
})

const resourceColors: Record<string, string> = {
  medical: "#f43f5e",
  police: "#0ea5e9",
  fire: "#f97316",
  pharmacy: "#10b981"
}

type Resource = {
  id: string
  name: string
  type: string
  lat: number
  lng: number
}

type Props = {
  resources: Resource[]
  userLocation: { lat: number; lng: number } | null
  className?: string
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, 14)
  }, [center, map])
  return null
}

export default function ResourceMap({ resources, userLocation, className = "" }: Props) {
  const defaultCenter: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : [37.3382, -121.8863] // Downtown San Jose default

  return (
    <MapContainer
      center={defaultCenter}
      zoom={14}
      className={`w-full rounded-lg ${className}`}
      style={{ minHeight: "200px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={defaultCenter} />
      
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>
            <span className="font-medium">Your location</span>
          </Popup>
        </Marker>
      )}
      
      {resources.map((resource) => (
        <Marker 
          key={resource.id} 
          position={[resource.lat, resource.lng]}
          icon={createIcon(resourceColors[resource.type] || "#6b7280")}
        >
          <Popup>
            <span className="font-medium">{resource.name}</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
