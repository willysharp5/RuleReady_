'use client'

import { useState } from 'react'
import { Send, User, Bot, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    url?: string
    jurisdiction?: string
    similarity: number
  }>
}

export default function ChatFeature() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your RuleReady compliance assistant. Ask me anything about US employment law.',
      sources: []
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'This is a placeholder response. The actual chat will integrate with your compliance AI backend.',
        sources: [
          { url: 'https://example.com/law1', jurisdiction: 'California', similarity: 0.92 },
          { url: 'https://example.com/law2', jurisdiction: 'New York', similarity: 0.87 }
        ]
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <h2 className="text-2xl font-semibold text-zinc-900">Compliance Chat</h2>
        <p className="text-sm text-zinc-500 mt-1">Ask questions about employment law compliance</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto space-y-4 mb-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                ${message.role === 'user' ? 'bg-purple-500' : 'bg-zinc-200'}
              `}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-zinc-600" />
                )}
              </div>

              {/* Message Content */}
              <div className="flex flex-col gap-2">
                <div className={`
                  px-4 py-3 rounded-xl
                  ${message.role === 'user' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-white border border-zinc-200 text-zinc-900'
                  }
                `}>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="space-y-1 pl-2">
                    <p className="text-xs font-medium text-zinc-500">Sources:</p>
                    {message.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{source.jurisdiction} ({(source.similarity * 100).toFixed(0)}% match)</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center">
                <Bot className="w-4 h-4 text-zinc-600" />
              </div>
              <div className="bg-white border border-zinc-200 px-4 py-3 rounded-xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 flex-shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask about employment law compliance..."
          className="flex-1"
          disabled={isLoading}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

