"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useConnectionStore } from "@/stores/connection-store"
import {
  Activity,
  CheckCircle2,
  CloudCog,
  Database,
  DollarSign,
  Eye,
  FileCheck,
  Presentation,
  Settings,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/monitoring", label: "Monitor", icon: Eye },
  { href: "/auto-safe", label: "Auto-Safe", icon: Zap },
  { href: "/approvals", label: "Approvals", icon: FileCheck },
  { href: "/savings", label: "Savings", icon: DollarSign },
  { href: "/demo", label: "Demo", icon: Presentation },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Header() {
  const pathname = usePathname()
  const { isConnected, url, initialize } = useConnectionStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  // Extract project name from URL
  const projectName = url
    ? url.replace("https://", "").replace(".supabase.co", "")
    : "Not connected"

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 shadow-sm">
      <div className="container flex h-16 items-center">
        {/* Logo */}
        <Link href="/" className="mr-8 flex items-center space-x-3 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300">
            <CloudCog className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">FinOps AI</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center space-x-1 text-sm">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2 px-4 h-9 rounded-lg transition-all duration-200",
                    isActive && "bg-primary/10 text-primary shadow-sm border border-primary/20"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Connection Status */}
        <div className="ml-auto flex items-center gap-3">
          <Link href="/setup">
            <Badge
              variant={isConnected ? "success" : "secondary"}
              className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-all duration-200 px-4 py-1.5 rounded-lg shadow-sm hover:shadow-md"
            >
              {isConnected ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="font-mono text-xs">{projectName}</span>
                </>
              ) : (
                <>
                  <Database className="h-3.5 w-3.5" />
                  <span>Connect Database</span>
                </>
              )}
            </Badge>
          </Link>
        </div>
      </div>
    </header>
  )
}
