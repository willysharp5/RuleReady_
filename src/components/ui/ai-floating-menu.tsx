'use client'

import { useState } from 'react'
import { Sparkles, ArrowUp, Loader2, Check, X, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AiFloatingMenuProps {
  isVisible: boolean
  position: { top: number; left: number }
  selectedText: string
  onGenerate: (prompt: string) => void
  onApply: () => void
  onDiscard: () => void
  onTryAgain: () => void
  isProcessing: boolean
  generatedText: string
  onClose: () => void
}

export function AiFloatingMenu({ 
  isVisible, 
  position, 
  selectedText,
  onGenerate, 
  onApply,
  onDiscard,
  onTryAgain,
  isProcessing, 
  generatedText,
  onClose 
}: AiFloatingMenuProps) {
  const [showInput, setShowInput] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')

  if (!isVisible || !selectedText) return null

  const handleSubmit = () => {
    if (customPrompt.trim()) {
      onGenerate(customPrompt)
      setCustomPrompt('')
    }
  }

  const handleClose = () => {
    setShowInput(false)
    setCustomPrompt('')
    onDiscard()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[299]" 
        onMouseDown={(e) => {
          e.preventDefault()
          handleClose()
        }}
      />
      
      <div
        className="fixed z-[300]"
        style={{
          top: `${position.top}px`,
          left: (showInput || generatedText)
            ? `${Math.max(10, Math.min(window.innerWidth - 610, position.left - 250))}px` // Expanded: keep 600px in viewport
            : `${position.left}px`, // Button only: keep below selection center
        }}
      >
        {!showInput && !generatedText ? (
          // Initial button
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowInput(true)
            }}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg"
          >
            <Sparkles className="h-4 w-4" />
            Ask AI
          </button>
        ) : (
          // Expanded chat interface
          <div className="bg-white rounded-xl shadow-2xl border-2 border-purple-300 w-[600px] flex flex-col">
            {/* Input */}
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Input
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Tell AI what else needs to be changed..."
                  className="flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customPrompt.trim() && !isProcessing) {
                      handleSubmit()
                    }
                    if (e.key === 'Escape') {
                      handleClose()
                    }
                  }}
                  disabled={isProcessing}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!customPrompt.trim() || isProcessing}
                  size="sm"
                  className="h-8 w-8 rounded-lg p-0 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Generated text area */}
            {isProcessing ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-purple-600 mr-2" />
                <span className="text-sm text-purple-600 font-medium">Generating...</span>
              </div>
            ) : generatedText ? (
              <div className="max-h-[250px] overflow-y-auto p-4 bg-blue-50 border-y border-blue-100">
                <div className="prose prose-sm prose-blue max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {generatedText}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-500 text-center">
                Enter a prompt above to generate text
              </div>
            )}
            
            {/* Action buttons */}
            {generatedText && !isProcessing && (
              <div className="p-3 border-t border-gray-200 flex items-center justify-between">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  size="sm"
                  className="text-gray-600"
                >
                  <X className="w-4 h-4 mr-1" />
                  Discard
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      onTryAgain()
                      setShowInput(true)
                    }}
                    variant="outline"
                    size="sm"
                    className="text-gray-600"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Try Again
                  </Button>
                  <Button
                    onClick={() => {
                      onApply()
                      handleClose()
                    }}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
