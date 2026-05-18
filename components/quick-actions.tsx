"use client"

import { Pill, MapPin, RefreshCw } from "lucide-react"

interface QuickActionsProps {
  onAction: (action: string) => void
}

const actions = [
  { label: "OTC Medications", value: "Show me OTC medication recommendations", icon: Pill },
  { label: "Find Hospitals", value: "Help me find nearby hospitals", icon: MapPin },
  { label: "New Consultation", value: "Start a new consultation", icon: RefreshCw },
]

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.value}
            onClick={() => onAction(action.value)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <Icon className="w-3.5 h-3.5" />
            {action.label}
          </button>
        )
      })}
    </div>
  )
}
