'use client'

import { ConvexReactClient } from "convex/react"
import { ConvexProvider } from "convex/react"
import { ReactNode } from "react"
import { ToastProvider } from "@/hooks/use-toast"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

console.log('🔧 Convex client initialized with URL:', process.env.NEXT_PUBLIC_CONVEX_URL)

export function Providers({ children }: { children: ReactNode }) {
  console.log('🔧 ConvexProvider rendering')
  return (
    <ConvexProvider client={convex}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ConvexProvider>
  )
}