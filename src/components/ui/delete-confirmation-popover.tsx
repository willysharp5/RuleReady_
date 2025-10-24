'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { AlertTriangle, Trash2 } from 'lucide-react'

interface DeleteConfirmationPopoverProps {
  trigger: React.ReactNode
  title: string
  description: string
  itemName?: string
  onConfirm: () => void | Promise<void>
  destructive?: boolean
  isLoading?: boolean
  disabled?: boolean
}

export function DeleteConfirmationPopover({ 
  trigger, 
  title, 
  description, 
  itemName,
  onConfirm, 
  destructive = true,
  isLoading = false,
  disabled = false
}: DeleteConfirmationPopoverProps) {
  const [open, setOpen] = React.useState(false)

  const handleConfirm = async () => {
    try {
      await onConfirm()
      setOpen(false)
    } catch (error) {
      console.error('Delete operation failed:', error)
      // Keep popover open if deletion fails
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm">{title}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
              {itemName && (
                <div className="mt-2 p-2 bg-muted rounded text-xs font-mono break-all">
                  {itemName}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant={destructive ? "destructive" : "default"} 
              size="sm"
              onClick={handleConfirm}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3 w-3" />
                  Yes, Delete
                </>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

