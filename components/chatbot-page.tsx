"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import type { ChatMessage, ConversationPhase, SymptomMatch } from "@/lib/chat-types"
import { ChatHeader } from "@/components/chat-header"
import { ChatMessageBubble } from "@/components/chat-message-bubble"
import { ChatInput } from "@/components/chat-input"
import { SymptomSelector } from "@/components/symptom-selector"
import { QuickActions } from "@/components/quick-actions"
import { ConsultationHistory } from "@/components/consultation-history"
import { SymptomBrowser } from "@/components/symptom-browser"
import { generateConsultationId, type ConsultationSummary } from "@/lib/consultation-history"
import { apiUrl, getFetchOptions } from "@/lib/api"
import type { LocationData } from "@/app/page"

const AI_NAME = "GrammaCare AI"

let msgCounter = 0
function makeId() {
  msgCounter++
  return `msg-${msgCounter}-${Date.now()}`
}

interface ChatbotPageProps {
  location: LocationData | null
  locationError: string | null
  onRequestLocation: () => void
}

export function ChatbotPage({ location, locationError, onRequestLocation }: ChatbotPageProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [phase, setPhase] = useState<ConversationPhase>("greeting")
  const [isLoading, setIsLoading] = useState(false)
  const [symptomMatches, setSymptomMatches] = useState<SymptomMatch[]>([])

  // Consultation state
  const [selectedSymptom, setSelectedSymptom] = useState("")
  const [numDays, setNumDays] = useState(0)
  const [currentDisease, setCurrentDisease] = useState("")
  const [severityLevel, setSeverityLevel] = useState("")
  const [isSevere, setIsSevere] = useState(false)

  // Follow-up questions state
  const [followupSymptoms, setFollowupSymptoms] = useState<{ name: string; display: string }[]>([])
  const [followupIndex, setFollowupIndex] = useState(0)
  const [confirmedSymptoms, setConfirmedSymptoms] = useState<string[]>([])

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentConsultationId, setCurrentConsultationId] = useState<string>("")
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [symptomBrowserOpen, setSymptomBrowserOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const patientName = user?.name || "Friend"

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const addMessage = useCallback((role: ChatMessage["role"], content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role, content, timestamp: new Date() },
    ])
  }, [])

  const addTypingIndicator = useCallback(() => {
    const id = makeId()
    setMessages((prev) => [
      ...prev,
      { id, role: "assistant", content: "", timestamp: new Date(), isTyping: true },
    ])
    return id
  }, [])

  const removeTypingIndicator = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const callApi = useCallback(
    async (action: string, extraData?: Record<string, unknown>) => {
      const res = await fetch(apiUrl("/api/chat"), {
        ...getFetchOptions({ method: "POST", headers: { "Content-Type": "application/json" } }),
        body: JSON.stringify({
          action,
          patientName,
          lat: location?.lat,
          lon: location?.lon,
          locationSource: location?.source,
          ...extraData,
        }),
      })
      return res.json()
    },
    [patientName, location]
  )

  // ── Save consultation to history ────────────────────────────────────
  const saveConsultation = useCallback(async () => {
    if (!currentConsultationId || messages.length < 3) return

    const consultation: ConsultationSummary = {
      id: currentConsultationId,
      date: new Date().toISOString(),
      username: patientName,
      symptom: selectedSymptom.replace(/_/g, " "),
      disease: currentDisease,
      severityLevel,
      messages: messages
        .filter(m => !m.isTyping)
        .map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString()
        }))
    }

    try {
      await fetch(apiUrl("/api/history"), {
        ...getFetchOptions({ method: "POST", headers: { "Content-Type": "application/json" } }),
        body: JSON.stringify({ action: "save", consultation })
      })
      setHistoryRefreshKey(prev => prev + 1)
    } catch (error) {
      console.error("[v0] Error saving consultation:", error)
    }
  }, [currentConsultationId, messages, patientName, selectedSymptom, currentDisease, severityLevel])

  // ── Reset all consultation state ──────────────────────────────────
  const resetConsultation = useCallback(() => {
    // Save current consultation before resetting
    if (messages.length > 3 && currentDisease) {
      saveConsultation()
    }
    
    setMessages([])
    setPhase("greeting")
    setSelectedSymptom("")
    setNumDays(0)
    setCurrentDisease("")
    setSeverityLevel("")
    setIsSevere(false)
    setFollowupSymptoms([])
    setFollowupIndex(0)
    setConfirmedSymptoms([])
    setSymptomMatches([])
    setCurrentConsultationId(generateConsultationId(patientName))
    msgCounter = 0
  }, [messages, currentDisease, saveConsultation, patientName])

  // ── Load a previous consultation ──────────────────────────────────
  const handleLoadConsultation = useCallback((consultation: ConsultationSummary) => {
    setMessages(consultation.messages.map((m, i) => ({
      id: `loaded-${i}`,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp)
    })))
    setSelectedSymptom(consultation.symptom.replace(/ /g, "_"))
    setCurrentDisease(consultation.disease)
    setSeverityLevel(consultation.severityLevel)
    setCurrentConsultationId(consultation.id)
    setPhase("farewell") // Set to farewell so they can start a new one
    setSidebarOpen(false)
  }, [])

  // Initialize consultation ID on mount
  useEffect(() => {
    if (!currentConsultationId) {
      setCurrentConsultationId(generateConsultationId(patientName))
    }
  }, [patientName, currentConsultationId])

  // ── Ask the next follow-up symptom question ───────────────────────
  const askNextFollowup = useCallback(
    (symptoms: { name: string; display: string }[], index: number) => {
      if (index < symptoms.length) {
        addMessage(
          "assistant",
          `Are you also experiencing **${symptoms[index].display}**? (yes/no)`
        )
      }
    },
    [addMessage]
  )

  // ── Initial greeting ──────────────────────────────────────────────
  useEffect(() => {
    if (phase === "greeting" && messages.length === 0) {
      const greet = async () => {
        setIsLoading(true)
        const typingId = addTypingIndicator()
        try {
          const data = await callApi("greeting")
          removeTypingIndicator(typingId)
          addMessage("assistant", data.message)

          // Immediately follow with ask_symptom
          const typingId2 = addTypingIndicator()
          const data2 = await callApi("ask_symptom")
          removeTypingIndicator(typingId2)
          addMessage("assistant", data2.message)
          setPhase("ask_symptom")
        } catch {
          removeTypingIndicator(typingId)
          addMessage(
            "assistant",
            `Welcome, ${patientName}! I'm GrammaCare AI, your healthcare assistant. Please tell me your main symptom -- like headache, fever, cough, or itching -- and I'll guide you from there.`
          )
          setPhase("ask_symptom")
        }
        setIsLoading(false)
      }
      greet()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Run the full diagnosis pipeline ───────────────────────────────
  async function runDiagnosis(days: number, confirmed: string[]) {
    const typingId = addTypingIndicator()
    try {
      addMessage("system", `${AI_NAME} is preparing your diagnosis report...`)
      const data = await callApi("diagnose", {
        data: {
          selectedSymptom,
          days,
          confirmedSymptoms: confirmed,
          disease: currentDisease,
        },
      })
      removeTypingIndicator(typingId)

      const disease = data.disease || currentDisease
      setCurrentDisease(disease)
      setSeverityLevel(data.severityLevel || "Moderate")
      setIsSevere(data.isSevere || false)

      addMessage("assistant", data.diagnosis)
      setPhase("diagnosis_result")

      setTimeout(() => {
        addMessage(
          "assistant",
          `Would you like me to suggest **OTC medications and home remedies** for ${disease}? (yes/no)`
        )
        setPhase("ask_otc")
      }, 1200)
    } catch {
      removeTypingIndicator(typingId)
      addMessage("assistant", "I had trouble generating the diagnosis. Please try again.")
      setPhase("free_chat")
    }
  }

  // ── Find nearby hospitals ─────────────────────────────────────────
  async function findHospitals() {
    const typingId = addTypingIndicator()
    
    // Check if we have GPS location
    if (!location && !locationError) {
      addMessage("system", "Requesting location access for accurate hospital recommendations...")
      onRequestLocation()
    }
    
    try {
      const locationMsg = location 
        ? `Using GPS coordinates (${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}) for nearby hospitals...`
        : "Finding hospitals based on approximate location..."
      addMessage("system", locationMsg)
      
      const data = await callApi("find_hospitals", {
        data: { disease: currentDisease || selectedSymptom },
      })
      removeTypingIndicator(typingId)

      if (data.location) {
        const locSource = data.location.source === "gps" ? "GPS" : "IP-based"
        addMessage(
          "system",
          `Location (${locSource}): ${data.location.area || data.location.city}, ${data.location.region || ""}, ${data.location.country || ""}`
        )
      }

      addMessage("assistant", data.message)
      setPhase("hospital_result")

      setTimeout(() => {
        doShowFarewell()
      }, 1500)
    } catch {
      removeTypingIndicator(typingId)
      addMessage("assistant", "I had trouble finding hospitals. Please try again.")
      setPhase("free_chat")
    }
  }

  // ── Show farewell + disclaimer ────────────────────────────────────
  async function doShowFarewell() {
    const typingId = addTypingIndicator()
    try {
      const data = await callApi("farewell", {
        data: { disease: currentDisease || "their health concern" },
      })
      removeTypingIndicator(typingId)
      addMessage("assistant", data.message)
    } catch {
      removeTypingIndicator(typingId)
      addMessage(
        "assistant",
        `Thank you for consulting with me, ${patientName}! Take care and remember to follow the precautions. Wishing you a speedy recovery!`
      )
    }

    addMessage(
      "system",
      `DISCLAIMER: ${AI_NAME} is an AI-powered assistant and does NOT replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical decisions.`
    )
    setPhase("farewell")
    
    // Save consultation to history
    setTimeout(() => {
      saveConsultation()
    }, 500)
  }

  // ── Main message handler ──────────────────────────────────────────
  async function handleSend(text: string) {
      if (!text.trim() || isLoading) return
      addMessage("user", text)
      setIsLoading(true)

      switch (phase) {
        // ── Phase: User enters their symptom ─────────────────────────
        case "ask_symptom": {
          const typingId = addTypingIndicator()
          try {
            const data = await callApi("match_symptom", { symptom: text })
            removeTypingIndicator(typingId)

            if (data.matches && data.matches.length > 0) {
              if (data.matches.length === 1) {
                // Single match - auto select
                const match = data.matches[0]
                setSelectedSymptom(match.name)
                addMessage(
                  "assistant",
                  `Understood -- **${match.display}**. How many days have you been experiencing this?`
                )
                setPhase("ask_days")
              } else {
                // Multiple matches - show selector
                setSymptomMatches(
                  data.matches.map((m: { name: string; display: string }, i: number) => ({
                    index: i,
                    name: m.name,
                    display: m.display,
                  }))
                )
                addMessage(
                  "assistant",
                  `I found these matching symptoms. Please select the one that best describes what you're experiencing:`
                )
                setPhase("select_symptom")
              }
            } else {
              addMessage(
                "assistant",
                `I'm sorry ${patientName}, I didn't recognize that symptom. Could you describe it differently? For example: **cough**, **fever**, **headache**, **itching**, **vomiting**, or **fatigue**.`
              )
            }
          } catch {
            removeTypingIndicator(typingId)
            addMessage("assistant", "I had trouble processing that. Could you try describing your symptom again?")
          }
          break
        }

        // ── Phase: User enters number of days ────────────────────────
        case "ask_days": {
          const days = parseInt(text)
          if (isNaN(days) || days <= 0) {
            addMessage("assistant", "Could you give me that as a number? For example: **3**")
          } else {
            setNumDays(days)
            addMessage("system", `Duration recorded: ${days} day(s)`)

            // Now get follow-up symptoms (traverse_tree equivalent)
            const typingId = addTypingIndicator()
            try {
              const data = await callApi("get_followup_symptoms", {
                data: { selectedSymptom },
              })
              removeTypingIndicator(typingId)

              if (data.relatedSymptoms && data.relatedSymptoms.length > 0) {
                setCurrentDisease(data.disease)
                setFollowupSymptoms(data.relatedSymptoms)
                setFollowupIndex(0)
                setConfirmedSymptoms([])

                addMessage(
                  "assistant",
                  `Thank you, ${patientName}. I have a few more quick questions to refine my assessment. Please answer with **yes** or **no**.`
                )

                // Ask the first follow-up question
                setTimeout(() => {
                  askNextFollowup(data.relatedSymptoms, 0)
                  setPhase("followup")
                }, 600)
              } else {
                // No follow-up symptoms - go straight to diagnosis
                setPhase("diagnosing")
                runDiagnosis(days, [])
              }
            } catch {
              removeTypingIndicator(typingId)
              addMessage("assistant", "I had trouble getting follow-up questions. Let me proceed with the diagnosis.")
              runDiagnosis(days, [])
            }
          }
          break
        }

        // ── Phase: Follow-up yes/no questions ────────────────────────
        case "followup": {
          const answer = text.trim().toLowerCase()
          if (!["yes", "no", "y", "n"].includes(answer)) {
            addMessage("assistant", "Please answer **yes** or **no**.")
            break
          }

          const isYes = answer === "yes" || answer === "y"
          const currentSymptom = followupSymptoms[followupIndex]

          // Record the answer
          const newConfirmed = [...confirmedSymptoms]
          if (isYes && currentSymptom) {
            newConfirmed.push(currentSymptom.name)
          }
          setConfirmedSymptoms(newConfirmed)

          const nextIndex = followupIndex + 1

          if (nextIndex < followupSymptoms.length) {
            // More questions to ask
            setFollowupIndex(nextIndex)
            askNextFollowup(followupSymptoms, nextIndex)
          } else {
            // All follow-up questions done -> run diagnosis
            addMessage("system", "All follow-up questions complete. Preparing your diagnosis...")
            setPhase("diagnosing")

            // Small delay for UX
            setTimeout(() => {
              runDiagnosis(numDays, newConfirmed)
            }, 500)
          }
          break
        }

        // ── Phase: Post-diagnosis - ask for OTC/Hospital/etc ─────────
        case "ask_otc": {
          const answer = text.trim().toLowerCase()
          if (answer === "yes" || answer === "y") {
            const typingId = addTypingIndicator()
            try {
              addMessage("system", "Generating medication recommendations...")
              const data = await callApi("otc_recommendations", {
                data: { disease: currentDisease, severityLevel },
              })
              removeTypingIndicator(typingId)
              addMessage("assistant", data.message)
            } catch {
              removeTypingIndicator(typingId)
              addMessage("assistant", "I had trouble fetching medication recommendations.")
            }
          }

          // Now ask about hospitals
          if (isSevere) {
            // Auto-trigger for severe cases
            addMessage(
              "assistant",
              `${patientName}, given the severity of your condition, let me find nearby hospitals for you right away.`
            )
            setPhase("hospital_result")
            setTimeout(() => { findHospitals() }, 500)
          } else {
            addMessage(
              "assistant",
              `${patientName}, would you like me to find nearby hospitals/specialists for you? (yes/no)`
            )
            setPhase("ask_hospital")
          }
          break
        }

        // ── Phase: Ask if they want hospital recommendations ─────────
        case "ask_hospital": {
          const answer = text.trim().toLowerCase()
          if (answer === "yes" || answer === "y") {
            setPhase("hospital_result")
            await findHospitals()
          } else {
            await doShowFarewell()
          }
          break
        }

        // ── Phase: Free chat (after the whole consultation) ──────────
        case "free_chat":
        case "hospital_result":
        case "farewell":
        default: {
          const lower = text.toLowerCase()
          if (
            lower.includes("otc") ||
            lower.includes("medication") ||
            lower.includes("medicine") ||
            lower.includes("remedy")
          ) {
            const typingId = addTypingIndicator()
            try {
              const data = await callApi("otc_recommendations", {
                data: { disease: currentDisease || selectedSymptom, severityLevel: severityLevel || "Moderate" },
              })
              removeTypingIndicator(typingId)
              addMessage("assistant", data.message)
            } catch {
              removeTypingIndicator(typingId)
              addMessage("assistant", "I had trouble fetching medication recommendations. Please try again.")
            }
          } else if (
            lower.includes("hospital") ||
            lower.includes("doctor") ||
            lower.includes("specialist") ||
            lower.includes("nearby")
          ) {
            await findHospitals()
          } else if (
            lower.includes("bye") ||
            lower.includes("thank") ||
            lower.includes("goodbye")
          ) {
            await doShowFarewell()
          } else if (
            lower.includes("new") ||
            lower.includes("restart") ||
            lower.includes("start over")
          ) {
            resetConsultation()
          } else {
            const typingId = addTypingIndicator()
            try {
              const data = await callApi("free_chat", { data: { message: text } })
              removeTypingIndicator(typingId)
              addMessage("assistant", data.message)
            } catch {
              removeTypingIndicator(typingId)
              addMessage("assistant", "I had trouble processing your message. Could you try again?")
            }
          }
          break
        }
      }
      setIsLoading(false)
    }

  // ── Symptom selector callback ─────────────────────────────────────
  const handleSymptomSelect = useCallback(
    (match: SymptomMatch & { display?: string }) => {
      setSelectedSymptom(match.name)
      setSymptomMatches([])
      addMessage("user", match.display || match.name.replace(/_/g, " "))
      addMessage(
        "assistant",
        `Understood -- **${(match.display || match.name).replace(/_/g, " ")}**. How many days have you been experiencing this symptom?`
      )
      setPhase("ask_days")
    },
    [addMessage]
  )

  function handleQuickAction(action: string) {
    handleSend(action)
  }

  // ── Handle symptom selection from browser ─────────────────────────
  const handleBrowserSymptomSelect = useCallback(
    (symptomName: string, displayName: string) => {
      setSelectedSymptom(symptomName)
      setSymptomMatches([])
      addMessage("user", displayName)
      addMessage(
        "assistant",
        `Understood -- **${displayName}**. How many days have you been experiencing this symptom?`
      )
      setPhase("ask_days")
    },
    [addMessage]
  )

  // ── Placeholder text based on current phase ───────────────────────
  function getPlaceholder() {
    switch (phase) {
      case "ask_symptom":
        return "Describe your main symptom (e.g., headache, fever, cough)..."
      case "select_symptom":
        return "Select a symptom from the options above..."
      case "ask_days":
        return "Enter number of days (e.g., 3)..."
      case "followup":
        return "Type yes or no..."
      case "ask_otc":
        return "Type yes or no..."
      case "ask_hospital":
        return "Type yes or no..."
      default:
        return "Type your message..."
    }
  }

  const showQuickActions =
    phase === "free_chat" || phase === "farewell" || phase === "hospital_result"

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          role="presentation"
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-card border-r border-border transform transition-transform lg:transform-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } flex flex-col pt-16 lg:pt-0`}
        >
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Consultation Info</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium text-foreground">Current Session</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedSymptom
                    ? `Symptom: ${selectedSymptom.replace(/_/g, " ")}`
                    : "Awaiting symptom..."}
                </p>
                {currentDisease && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Condition: {currentDisease}
                  </p>
                )}
                {severityLevel && (
                  <p className="text-xs mt-0.5">
                    <span className={`font-medium ${
                      severityLevel === "High"
                        ? "text-destructive"
                        : severityLevel === "Moderate"
                        ? "text-orange-500"
                        : "text-primary"
                    }`}>
                      Severity: {severityLevel}
                    </span>
                  </p>
                )}
              </div>

              {/* Consultation flow tracker */}
              <div className="p-3 rounded-lg bg-muted border border-border">
                <p className="text-xs font-semibold text-foreground mb-2">Consultation Flow</p>
                <div className="flex flex-col gap-1.5">
                  {[
                    { key: "greeting", label: "Greeting" },
                    { key: "ask_symptom", label: "Symptom Input" },
                    { key: "ask_days", label: "Duration" },
                    { key: "followup", label: "Follow-up Questions" },
                    { key: "diagnosing", label: "Diagnosis" },
                    { key: "ask_otc", label: "OTC Medications" },
                    { key: "ask_hospital", label: "Hospital Finder" },
                    { key: "farewell", label: "Complete" },
                  ].map((step) => {
                    const phaseOrder = [
                      "greeting", "ask_symptom", "select_symptom", "ask_days",
                      "followup", "diagnosing", "diagnosis_result", "ask_otc",
                      "otc_result", "ask_hospital", "hospital_result", "farewell", "free_chat",
                    ]
                    const currentIdx = phaseOrder.indexOf(phase)
                    const stepIdx = phaseOrder.indexOf(step.key)
                    const isDone = stepIdx < currentIdx
                    const isActive = step.key === phase ||
                      (step.key === "ask_symptom" && phase === "select_symptom") ||
                      (step.key === "diagnosing" && phase === "diagnosis_result") ||
                      (step.key === "ask_otc" && phase === "otc_result") ||
                      (step.key === "ask_hospital" && phase === "hospital_result")

                    return (
                      <div key={step.key} className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isDone
                              ? "bg-primary"
                              : isActive
                              ? "bg-primary animate-pulse"
                              : "bg-border"
                          }`}
                        />
                        <span
                          className={`text-[11px] ${
                            isDone
                              ? "text-muted-foreground line-through"
                              : isActive
                              ? "text-foreground font-medium"
                              : "text-muted-foreground/50"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Previous consultations history */}
              <div className="border-t border-border pt-3 mt-1">
                <ConsultationHistory
                  key={historyRefreshKey}
                  username={patientName}
                  onLoadConsultation={handleLoadConsultation}
                  currentConsultationId={currentConsultationId}
                />
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-border">
            <button
              onClick={() => {
                resetConsultation()
                setSidebarOpen(false)
              }}
              className="w-full py-2.5 px-4 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              New Consultation
            </button>
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-3xl mx-auto flex flex-col gap-4">
              {messages.map((msg) => (
                <ChatMessageBubble key={msg.id} message={msg} patientName={patientName} />
              ))}

              {phase === "select_symptom" && symptomMatches.length > 0 && (
                <SymptomSelector matches={symptomMatches} onSelect={handleSymptomSelect} />
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {showQuickActions && (
            <div className="px-4 pb-2">
              <div className="max-w-3xl mx-auto">
                <QuickActions onAction={handleQuickAction} />
              </div>
            </div>
          )}

          {/* Show browse symptoms button during symptom input phase */}
          {(phase === "ask_symptom" || phase === "select_symptom") && (
            <div className="px-4 pb-2">
              <div className="max-w-3xl mx-auto">
                <button
                  onClick={() => setSymptomBrowserOpen(true)}
                  className="w-full py-2.5 px-4 rounded-lg border border-primary/30 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 hover:border-primary/50 transition-all flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="7" height="7" x="3" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="14" rx="1" />
                    <rect width="7" height="7" x="3" y="14" rx="1" />
                  </svg>
                  Browse All Symptoms
                </button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Or type your symptom directly below
                </p>
              </div>
            </div>
          )}

          <div className="px-4 pb-4 pt-2">
            <div className="max-w-3xl mx-auto">
              <ChatInput
                onSend={handleSend}
                disabled={isLoading || phase === "diagnosing" || phase === "diagnosis_result"}
                placeholder={getPlaceholder()}
              />
              <p className="text-xs text-muted-foreground text-center mt-2">
                GrammaCare AI is not a replacement for professional medical advice.
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Symptom Browser Modal */}
      <SymptomBrowser
        isOpen={symptomBrowserOpen}
        onClose={() => setSymptomBrowserOpen(false)}
        onSelectSymptom={handleBrowserSymptomSelect}
      />
    </div>
  )
}
