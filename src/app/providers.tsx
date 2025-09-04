'use client'

import { ConvexReactClient } from "convex/react"
import { ConvexProvider } from "convex/react"
import { ReactNode } from "react"
import { ToastProvider } from "@/hooks/use-toast"

export function Providers({ children }: { children: ReactNode }) {
  // Hardcode the URL to test if env var is the issue
  const convexUrl = "https://friendly-octopus-467.convex.cloud"
  console.log('🔗 ConvexProvider initializing with hardcoded URL:', convexUrl)
  
  const convex = new ConvexReactClient(convexUrl)
  console.log('🔗 ConvexReactClient created successfully:', !!convex)
  
  return (
    <ConvexProvider client={convex}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ConvexProvider>
  )
}