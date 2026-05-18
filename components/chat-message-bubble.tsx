"use client"

import type { ChatMessage } from "@/lib/chat-types"
import { Heart, User, Info } from "lucide-react"

interface ChatMessageBubbleProps {
  message: ChatMessage
  patientName: string
}

function formatContent(content: string) {
  // Split into lines first
  const lines = content.split("\n")

  return lines.map((line, lineIdx) => {
    // Process inline markdown: **bold**, *italic*, `code`
    const processInline = (text: string) => {
      const parts: (string | JSX.Element)[] = []
      let remaining = text
      let keyCounter = 0

      while (remaining.length > 0) {
        // Bold: **text**
        const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
        // Italic: *text*
        const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/)

        if (boldMatch && boldMatch.index !== undefined) {
          if (boldMatch.index > 0) {
            parts.push(remaining.slice(0, boldMatch.index))
          }
          parts.push(
            <strong key={`b-${lineIdx}-${keyCounter++}`} className="font-semibold">
              {boldMatch[1]}
            </strong>
          )
          remaining = remaining.slice(boldMatch.index + boldMatch[0].length)
        } else if (italicMatch && italicMatch.index !== undefined) {
          if (italicMatch.index > 0) {
            parts.push(remaining.slice(0, italicMatch.index))
          }
          parts.push(
            <em key={`i-${lineIdx}-${keyCounter++}`}>
              {italicMatch[1]}
            </em>
          )
          remaining = remaining.slice(italicMatch.index + italicMatch[0].length)
        } else {
          parts.push(remaining)
          remaining = ""
        }
      }
      return parts
    }

    // Handle headers: ### text or ## text
    if (line.match(/^#{1,3}\s+/)) {
      const cleaned = line.replace(/^#{1,3}\s+/, "")
      return (
        <div key={lineIdx} className="font-bold text-base mt-2 mb-1">
          {processInline(cleaned)}
        </div>
      )
    }

    // Handle list items with emoji bullets or numbered items
    if (line.match(/^\s*[-*]\s+/) || line.match(/^\s*\d+[.)]\s+/)) {
      const cleaned = line.replace(/^\s*[-*]\s+/, "").replace(/^\s*\d+[.)]\s+/, "")
      return (
        <div key={lineIdx} className="pl-4 mb-0.5">
          {processInline(cleaned)}
        </div>
      )
    }

    // Handle indented lines (sub-items)
    if (line.match(/^\s{3,}/)) {
      return (
        <div key={lineIdx} className="pl-6 text-muted-foreground mb-0.5">
          {processInline(line.trim())}
        </div>
      )
    }

    // Empty line = paragraph break
    if (line.trim() === "") {
      return <div key={lineIdx} className="h-2" />
    }

    // Normal line
    return (
      <span key={lineIdx}>
        {processInline(line)}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    )
  })
}

export function ChatMessageBubble({ message, patientName }: ChatMessageBubbleProps) {
  if (message.isTyping) {
    return (
      <div className="flex items-start gap-3 max-w-[85%]">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shrink-0">
          <Heart className="w-4 h-4" />
        </div>
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    )
  }

  if (message.role === "system") {
    return (
      <div className="flex justify-center px-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/80 text-muted-foreground text-xs font-medium max-w-[90%] text-center">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>{message.content}</span>
        </div>
      </div>
    )
  }

  const isUser = message.role === "user"

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""} max-w-[85%] ${isUser ? "ml-auto" : ""}`}>
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
          isUser ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <div className={`flex items-center gap-2 ${isUser ? "justify-end" : ""}`}>
          <span className={`text-xs font-medium ${isUser ? "text-muted-foreground" : "text-primary"}`}>
            {isUser ? patientName : "GrammaCare AI"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm bg-card border border-border text-card-foreground"
          }`}
        >
          {formatContent(message.content)}
        </div>
      </div>
    </div>
  )
}
