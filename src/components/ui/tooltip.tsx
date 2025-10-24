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
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const updatePosition = React.useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({ 
        x: rect.left + rect.width / 2, 
        y: side === "top" ? rect.top : rect.bottom 
      })
    }
  }, [side])

  const handleMouseEnter = () => {
    setIsVisible(true)
    updatePosition()
  }

  return (
    <>
      <div 
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={cn(
            "fixed z-[9999] px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none",
            "transition-opacity duration-200",
            className
          )}
          style={{
            left: position.x,
            top: side === "top" ? position.y - 8 : position.y + 8,
            transform: "translateX(-50%)" + (side === "top" ? " translateY(-100%)" : "")
          }}
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
    </>
  )
}
