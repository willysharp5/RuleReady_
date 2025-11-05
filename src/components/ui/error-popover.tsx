import * as React from 'react'
import { X, AlertCircle, AlertTriangle, Info, Flame, Clock, Wifi, Database, XCircle } from 'lucide-react'
import { Button } from './button'

export interface ErrorPopoverAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export type ErrorPopoverIcon = 'flame' | 'clock' | 'wifi' | 'database' | 'alert' | 'x-circle'

interface ErrorPopoverProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  variant?: 'error' | 'warning' | 'info'
  icon?: ErrorPopoverIcon
  actions?: ErrorPopoverAction[]
}

export function ErrorPopover({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  variant = 'error',
  icon,
  actions 
}: ErrorPopoverProps) {
  if (!isOpen) return null

  const variantStyles = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      title: 'text-red-900',
      text: 'text-red-800',
      iconColor: 'text-red-600'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      title: 'text-yellow-900',
      text: 'text-yellow-800',
      iconColor: 'text-yellow-600'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      title: 'text-blue-900',
      text: 'text-blue-800',
      iconColor: 'text-blue-600'
    }
  }

  const styles = variantStyles[variant]
  
  const iconMap = {
    flame: Flame,
    clock: Clock,
    wifi: Wifi,
    database: Database,
    alert: AlertTriangle,
    'x-circle': XCircle,
  }
  
  const IconComponent = icon ? iconMap[icon] : (variant === 'warning' ? AlertTriangle : AlertCircle)

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Popover */}
      <div className={`relative ${styles.bg} border-2 ${styles.border} rounded-lg shadow-2xl w-full max-w-md p-6 mx-4 animate-in fade-in zoom-in-95 duration-200`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-black/10 transition-colors"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
        
        {/* Icon and Title */}
        <div className="flex items-start gap-3 mb-3 pr-8">
          <IconComponent className={`h-6 w-6 flex-shrink-0 mt-0.5 ${styles.iconColor}`} />
          <h3 className={`text-lg font-semibold ${styles.title} flex-1`}>
            {title}
          </h3>
        </div>
        
        {/* Message - aligned with title */}
        <div className="ml-9">
          <p className={`text-sm ${styles.text} whitespace-pre-wrap leading-relaxed`}>
            {message}
          </p>
        </div>
        
        {/* Actions - aligned with message */}
        {actions && actions.length > 0 && (
          <div className="flex gap-2 mt-6 ml-9">
            {actions.map((action, idx) => (
              <Button
                key={idx}
                onClick={() => {
                  action.onClick()
                  onClose()
                }}
                className={
                  action.variant === 'primary'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300'
                }
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

