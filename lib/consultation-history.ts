// Types for consultation history storage

export interface ConsultationSummary {
  id: string
  date: string // ISO date string
  username: string
  symptom: string
  disease: string
  severityLevel: string
  messages: ConsultationMessage[]
}

export interface ConsultationMessage {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string // ISO date string
}

// Generate a unique consultation ID
export function generateConsultationId(username: string): string {
  const date = new Date()
  const dateStr = date.toISOString().split("T")[0] // YYYY-MM-DD
  const timeStr = date.toTimeString().split(" ")[0].replace(/:/g, "-") // HH-MM-SS
  const sanitizedName = username.toLowerCase().replace(/[^a-z0-9]/g, "-")
  return `${dateStr}_${sanitizedName}_${timeStr}`
}

// Format date for display
export function formatConsultationDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  } else if (diffDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
  }
}
