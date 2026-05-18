import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import type { ConsultationSummary } from "@/lib/consultation-history"

// Directory to store consultation history
const HISTORY_DIR = path.join(process.cwd(), "consultations")

// Ensure the consultations directory exists
async function ensureHistoryDir() {
  try {
    await fs.access(HISTORY_DIR)
  } catch {
    await fs.mkdir(HISTORY_DIR, { recursive: true })
  }
}

// Get file path for a consultation
function getConsultationPath(id: string): string {
  return path.join(HISTORY_DIR, `${id}.json`)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const id = searchParams.get("id")
  const username = searchParams.get("username")

  await ensureHistoryDir()

  // Get a specific consultation
  if (action === "get" && id) {
    try {
      const filePath = getConsultationPath(id)
      const content = await fs.readFile(filePath, "utf-8")
      return NextResponse.json(JSON.parse(content))
    } catch {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 })
    }
  }

  // List all consultations for a user
  if (action === "list") {
    try {
      const files = await fs.readdir(HISTORY_DIR)
      const consultations: ConsultationSummary[] = []

      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const content = await fs.readFile(path.join(HISTORY_DIR, file), "utf-8")
            const consultation = JSON.parse(content) as ConsultationSummary
            // Filter by username if provided
            if (!username || consultation.username.toLowerCase() === username.toLowerCase()) {
              consultations.push(consultation)
            }
          } catch {
            // Skip invalid files
          }
        }
      }

      // Sort by date, newest first
      consultations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      return NextResponse.json({ consultations })
    } catch {
      return NextResponse.json({ consultations: [] })
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, consultation } = body

  await ensureHistoryDir()

  // Save a consultation
  if (action === "save" && consultation) {
    try {
      const consultationData = consultation as ConsultationSummary
      const filePath = getConsultationPath(consultationData.id)
      await fs.writeFile(filePath, JSON.stringify(consultationData, null, 2), "utf-8")
      return NextResponse.json({ success: true, id: consultationData.id })
    } catch (error) {
      console.error("[v0] Error saving consultation:", error)
      return NextResponse.json({ error: "Failed to save consultation" }, { status: 500 })
    }
  }

  // Delete a consultation
  if (action === "delete" && body.id) {
    try {
      const filePath = getConsultationPath(body.id)
      await fs.unlink(filePath)
      return NextResponse.json({ success: true })
    } catch {
      return NextResponse.json({ error: "Failed to delete consultation" }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
