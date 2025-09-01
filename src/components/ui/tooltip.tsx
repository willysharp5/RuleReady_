import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  content: string | React.ReactNode
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  className?: string
}

export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            "absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap",
            "transition-opacity duration-200",
            {
              "bottom-full left-1/2 transform -translate-x-1/2 mb-2": side === "top",
              "top-full left-1/2 transform -translate-x-1/2 mt-2": side === "bottom",
              "right-full top-1/2 transform -translate-y-1/2 mr-2": side === "left",
              "left-full top-1/2 transform -translate-y-1/2 ml-2": side === "right",
            },
            className
          )}
        >
          {content}
          {/* Arrow */}
          <div
            className={cn(
              "absolute w-2 h-2 bg-gray-900 transform rotate-45",
              {
                "top-full left-1/2 transform -translate-x-1/2 -mt-1": side === "top",
                "bottom-full left-1/2 transform -translate-x-1/2 -mb-1": side === "bottom",
                "top-1/2 left-full transform -translate-y-1/2 -ml-1": side === "left",
                "top-1/2 right-full transform -translate-y-1/2 -mr-1": side === "right",
              }
            )}
          />
        </div>
      )}
    </div>
  )
}
