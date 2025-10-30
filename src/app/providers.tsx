'use client'

import { ConvexReactClient } from "convex/react"
import { ConvexProvider } from "convex/react"
import { ReactNode } from "react"
import { ToastProvider } from "@/hooks/use-toast"

const convexUrl = "https://friendly-octopus-467.convex.cloud"
const convex = new ConvexReactClient(convexUrl)

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ConvexProvider>
  )
}