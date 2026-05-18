"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { getApiBaseUrl, apiUrl, getFetchOptions } from "@/lib/api"

interface User {
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const DUMMY_USERS = [
  { email: "admin@grammacare.com", password: "admin123", name: "Dr. Admin" },
  { email: "doctor@grammacare.com", password: "doctor123", name: "Dr. Smith" },
  { email: "patient@grammacare.com", password: "patient123", name: "John Doe" },
  { email: "demo@grammacare.com", password: "demo123", name: "Demo User" },
]

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const apiBase = getApiBaseUrl()

  // When using Django, check session on load
  useEffect(() => {
    if (!apiBase) {
      setAuthChecked(true)
      return
    }
    fetch(apiUrl("/api/auth/user/"), getFetchOptions())
      .then((res) => {
        if (res.ok) return res.json()
        return { authenticated: false }
      })
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser({ email: data.user.email, name: data.user.name })
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true))
  }, [apiBase])

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      if (apiBase) {
        try {
          const res = await fetch(apiUrl("/api/auth/login/"), {
            ...getFetchOptions({ method: "POST", headers: { "Content-Type": "application/json" } }),
            body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
          })
          const data = await res.json()
          if (data.success && data.user) {
            setUser({ email: data.user.email, name: data.user.name })
            return { success: true }
          }
          return { success: false, error: data.error || "Invalid email or password. Please try again." }
        } catch {
          return { success: false, error: "Network error. Please try again." }
        }
      }
      const found = DUMMY_USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      )
      if (found) {
        setUser({ email: found.email, name: found.name })
        return { success: true }
      }
      return { success: false, error: "Invalid email or password. Please try again." }
    },
    [apiBase]
  )

  const logout = useCallback(async () => {
    if (apiBase) {
      try {
        await fetch(apiUrl("/api/auth/logout/"), getFetchOptions({ method: "POST" }))
      } catch {
        /* ignore */
      }
    }
    setUser(null)
  }, [apiBase])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
