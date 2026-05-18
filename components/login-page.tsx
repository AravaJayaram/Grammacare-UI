"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Heart, Eye, EyeOff, Shield, Activity, Stethoscope } from "lucide-react"

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    await new Promise((r) => setTimeout(r, 300))
    const result = await login(email, password)
    if (!result.success) {
      setError(result.error || "Login failed")
    }
    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
            <circle cx="50" cy="50" r="120" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="350" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="200" cy="350" r="150" stroke="currentColor" strokeWidth="0.5" />
            <path d="M0 200 Q100 150 200 200 Q300 250 400 200" stroke="currentColor" strokeWidth="0.5" />
            <path d="M0 250 Q100 200 200 250 Q300 300 400 250" stroke="currentColor" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-foreground/20 backdrop-blur-sm">
              <Heart className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">GrammaCare AI</h1>
              <p className="text-sm opacity-80">Healthcare ChatBot</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center gap-8">
          <h2 className="text-4xl font-bold leading-tight text-balance">
            Your Compassionate AI Health Companion
          </h2>
          <p className="text-lg opacity-90 leading-relaxed max-w-md">
            Powered by Machine Learning and Gemini AI to provide symptom analysis, preliminary diagnoses, and personalized health guidance.
          </p>

          <div className="flex flex-col gap-4 mt-4">
            <FeatureItem
              icon={<Activity className="w-5 h-5" />}
              title="ML-Powered Diagnosis"
              description="Decision Tree & SVM models for accurate symptom analysis"
            />
            <FeatureItem
              icon={<Stethoscope className="w-5 h-5" />}
              title="Gemini AI Insights"
              description="Warm, personalized health guidance and recommendations"
            />
            <FeatureItem
              icon={<Shield className="w-5 h-5" />}
              title="Hospital Finder"
              description="Auto-detect location and find nearby specialists"
            />
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-sm opacity-60">
            Not a replacement for professional medical advice.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-1 flex-col justify-center items-center px-6 py-12 bg-background">
        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary text-primary-foreground">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">GrammaCare AI</h1>
            <p className="text-xs text-muted-foreground">Healthcare ChatBot</p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground mt-2">Sign in to start your health consultation</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@grammacare.com"
                className="flex h-11 w-full rounded-lg border border-input bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="flex h-11 w-full rounded-lg border border-input bg-card px-4 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-11 items-center justify-center rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all mt-1"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </div>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 rounded-lg bg-muted/60 border border-border">
            <p className="text-xs font-semibold text-foreground mb-3">Demo Credentials</p>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              <DemoCred email="admin@grammacare.com" password="admin123" />
              <DemoCred email="doctor@grammacare.com" password="doctor123" />
              <DemoCred email="patient@grammacare.com" password="patient123" />
              <DemoCred email="demo@grammacare.com" password="demo123" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-foreground/15 shrink-0">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-sm opacity-75">{description}</p>
      </div>
    </div>
  )
}

function DemoCred({ email, password }: { email: string; password: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono">{email}</span>
      <span className="font-mono text-foreground/70">{password}</span>
    </div>
  )
}
