"use client"

import { useState, useEffect, useCallback } from "react"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { LoginPage } from "@/components/login-page"
import { ChatbotPage } from "@/components/chatbot-page"

export interface LocationData {
  lat: number
  lon: number
  accuracy?: number
  source: "gps" | "ip" | "unknown"
  city?: string
  region?: string
  country?: string
}

function AppContent() {
  const { isAuthenticated } = useAuth()
  const [location, setLocation] = useState<LocationData | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationRequested, setLocationRequested] = useState(false)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser")
      return
    }

    setLocationRequested(true)
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: "gps"
        })
        setLocationError(null)
      },
      (error) => {
        console.error("[v0] Geolocation error:", error)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied. Hospital recommendations will be less accurate.")
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information unavailable.")
            break
          case error.TIMEOUT:
            setLocationError("Location request timed out.")
            break
          default:
            setLocationError("An unknown error occurred getting location.")
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // Cache for 5 minutes
      }
    )
  }, [])

  // Request location when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !locationRequested) {
      requestLocation()
    }
  }, [isAuthenticated, locationRequested, requestLocation])

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <ChatbotPage 
      location={location} 
      locationError={locationError}
      onRequestLocation={requestLocation}
    />
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
