"use client"

import { useState, useEffect, useCallback } from "react"
import { Clock, Trash2, ChevronRight } from "lucide-react"
import { formatConsultationDate, type ConsultationSummary } from "@/lib/consultation-history"
import { apiUrl, getFetchOptions } from "@/lib/api"

interface ConsultationHistoryProps {
  username: string
  onLoadConsultation: (consultation: ConsultationSummary) => void
  currentConsultationId?: string
}

export function ConsultationHistory({ 
  username, 
  onLoadConsultation,
  currentConsultationId 
}: ConsultationHistoryProps) {
  const [consultations, setConsultations] = useState<ConsultationSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(
        apiUrl(`/api/history?action=list&username=${encodeURIComponent(username)}`),
        getFetchOptions()
      )
      const data = await res.json()
      setConsultations(data.consultations || [])
    } catch (error) {
      console.error("[v0] Error fetching history:", error)
    } finally {
      setIsLoading(false)
    }
  }, [username])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this consultation?")) return

    try {
      await fetch(apiUrl("/api/history"), {
        ...getFetchOptions({ method: "POST", headers: { "Content-Type": "application/json" } }),
        body: JSON.stringify({ action: "delete", id }),
      })
      setConsultations(prev => prev.filter(c => c.id !== id))
    } catch (error) {
      console.error("[v0] Error deleting consultation:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse flex flex-col gap-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (consultations.length === 0) {
    return (
      <div className="p-4 text-center">
        <Clock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No previous consultations</p>
        <p className="text-xs text-muted-foreground mt-1">Your consultation history will appear here</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-muted-foreground px-1 mb-1">
        Previous Consultations ({consultations.length})
      </p>
      {consultations.map((consultation) => {
        const isExpanded = expandedId === consultation.id
        const isCurrent = currentConsultationId === consultation.id

        return (
          <div 
            key={consultation.id}
            className={`rounded-lg border transition-all ${
              isCurrent 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50 bg-muted/30"
            }`}
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : consultation.id)}
              className="w-full p-3 text-left flex items-start gap-2"
            >
              <ChevronRight 
                className={`w-4 h-4 mt-0.5 shrink-0 text-muted-foreground transition-transform ${
                  isExpanded ? "rotate-90" : ""
                }`} 
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {consultation.disease || consultation.symptom || "Consultation"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatConsultationDate(consultation.date)}
                </p>
                {consultation.severityLevel && (
                  <span className={`text-[10px] font-medium mt-1 inline-block px-1.5 py-0.5 rounded ${
                    consultation.severityLevel === "High" 
                      ? "bg-destructive/10 text-destructive"
                      : consultation.severityLevel === "Moderate"
                      ? "bg-orange-500/10 text-orange-600"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {consultation.severityLevel}
                  </span>
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 flex gap-2">
                <button
                  onClick={() => onLoadConsultation(consultation)}
                  className="flex-1 py-1.5 px-3 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={(e) => handleDelete(consultation.id, e)}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Delete consultation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
