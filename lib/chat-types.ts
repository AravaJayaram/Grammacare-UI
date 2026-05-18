export type MessageRole = "user" | "assistant" | "system"

export type ConversationPhase =
  | "greeting"
  | "ask_symptom"
  | "select_symptom"
  | "ask_days"
  | "followup"
  | "diagnosing"
  | "diagnosis_result"
  | "ask_otc"
  | "otc_result"
  | "ask_hospital"
  | "hospital_result"
  | "farewell"
  | "free_chat"

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  isTyping?: boolean
}

export interface SymptomMatch {
  index: number
  name: string
}
