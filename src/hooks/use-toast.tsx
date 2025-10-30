import * as React from "react"
import { Toast, ToastTitle, ToastDescription } from "@/components/ui/toast"

export type ToastVariant = "default" | "success" | "error" | "warning" | "info"

interface ToastData {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastContextValue {
  toasts: ToastData[]
  addToast: (toast: Omit<ToastData, "id">) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([])
  const toastCounter = React.useRef(0)

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = React.useCallback((toast: Omit<ToastData, "id">) => {
    // Check for duplicate toasts (same title within 500ms)
    const now = Date.now()
    setToasts((prev) => {
      const isDuplicate = prev.some(existingToast => 
        existingToast.title === toast.title && 
        (now - parseInt(existingToast.id.split('-')[0])) < 500
      )
      
      if (isDuplicate) {
        console.log('Duplicate toast prevented:', toast.title)
        return prev // Skip duplicate
      }
      
      // Generate unique ID using timestamp + counter + random number
      const id = `${now}-${toastCounter.current++}-${Math.random().toString(36).substr(2, 9)}`
      const newToast = { ...toast, id }
      
      // Auto-remove toast after duration
      const duration = toast.duration ?? 5000
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
      
      return [...prev, newToast]
    })
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-0 right-0 z-50 m-4 flex max-h-screen w-full max-w-sm flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              variant={toast.variant}
              onClose={() => removeToast(toast.id)}
            >
              {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
              {toast.description && (
                <ToastDescription>{toast.description}</ToastDescription>
              )}
            </Toast>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}