import * as React from "react"
import { Toast, ToastTitle, ToastDescription } from "@/components/ui/toast"

export type ToastVariant = "default" | "success" | "error" | "warning" | "info"

export interface ToastAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

interface ToastData {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
  persistent?: boolean // Large toast on left side that requires dismissal
  actions?: ToastAction[] // Action buttons
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
        return prev // Skip duplicate
      }
      
      // Generate unique ID using timestamp + counter + random number
      const id = `${now}-${toastCounter.current++}-${Math.random().toString(36).substr(2, 9)}`
      const newToast = { ...toast, id }
      
      // Auto-remove toast after duration (unless persistent)
      if (!toast.persistent) {
        const duration = toast.duration ?? 5000
        if (duration > 0) {
          setTimeout(() => {
            removeToast(id)
          }, duration)
        }
      }
      
      return [...prev, newToast]
    })
  }, [removeToast])

  const persistentToasts = toasts.filter(t => t.persistent)
  const regularToasts = toasts.filter(t => !t.persistent)

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      
      {/* Persistent toasts - left side, large */}
      <div className="fixed left-4 top-20 z-[9999] flex max-h-[calc(100vh-100px)] w-full max-w-md flex-col gap-3 pointer-events-none">
        {persistentToasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              variant={toast.variant}
              onClose={() => removeToast(toast.id)}
              className="shadow-2xl border-2 p-6"
              data-state="open"
            >
              {toast.title && <ToastTitle className="text-lg font-semibold">{toast.title}</ToastTitle>}
              {toast.description && (
                <ToastDescription className="text-sm mt-2 whitespace-pre-wrap">{toast.description}</ToastDescription>
              )}
              {toast.actions && toast.actions.length > 0 && (
                <div className="flex gap-2 mt-4">
                  {toast.actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        action.onClick()
                        removeToast(toast.id)
                      }}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                        action.variant === 'primary' 
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </Toast>
          </div>
        ))}
      </div>
      
      {/* Regular toasts - bottom right, normal size */}
      <div className="fixed bottom-0 right-0 z-[9999] m-4 flex max-h-screen w-full max-w-sm flex-col gap-2 pointer-events-none">
        {regularToasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              variant={toast.variant}
              onClose={() => removeToast(toast.id)}
              data-state="open"
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