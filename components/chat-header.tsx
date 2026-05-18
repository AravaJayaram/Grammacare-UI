"use client"

import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { LogOut, Menu, X } from "lucide-react"

interface ChatHeaderProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function ChatHeader({ sidebarOpen, onToggleSidebar }: ChatHeaderProps) {
  const { user, logout } = useAuth()

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card shrink-0 z-50 relative">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted transition-colors text-foreground"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden bg-primary">
            <Image 
              src="/logo.jpg" 
              alt="GrammaCare AI Logo" 
              width={32} 
              height={32}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-foreground leading-none">GrammaCare AI</h1>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Healthcare ChatBot</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">Online</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {user?.name?.charAt(0) || "U"}
          </div>
          <span className="hidden md:block text-sm font-medium text-foreground">{user?.name}</span>
        </div>

        <button
          onClick={logout}
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Log out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
