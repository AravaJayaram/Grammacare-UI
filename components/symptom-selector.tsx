"use client"

import type { SymptomMatch } from "@/lib/chat-types"

interface SymptomSelectorProps {
  matches: (SymptomMatch & { display?: string })[]
  onSelect: (match: SymptomMatch & { display?: string }) => void
}

export function SymptomSelector({ matches, onSelect }: SymptomSelectorProps) {
  return (
    <div className="max-w-[85%]">
      <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-card border border-border">
        {matches.map((match) => (
          <button
            key={match.index}
            onClick={() => onSelect(match)}
            className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 border border-primary/20 hover:border-primary/40 transition-all"
          >
            {(match.display || match.name).replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  )
}
