'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { 
  Clock, 
  ExternalLink, 
  X, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Bot,
  Calendar,
  Hash
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChangeTrackingPopoverProps {
  trigger: React.ReactNode
  scrapeData: {
    _id: string
    websiteId: string
    websiteName: string
    url: string
    markdown?: string
    changeStatus: string
    scrapedAt: number
    aiAnalysis?: {
      changeType: string
      severity: string
      impactAreas: string[]
      confidence: number
    }
  }
}

export function ChangeTrackingPopover({ trigger, scrapeData }: ChangeTrackingPopoverProps) {
  const [open, setOpen] = React.useState(false)

  const getChangeStatusColor = (status: string) => {
    switch (status) {
      case 'changed': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'meaningful': return 'bg-red-100 text-red-800 border-red-300'
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'unchanged': return 'bg-green-100 text-green-800 border-green-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-[90vw] max-w-4xl h-[80vh] overflow-hidden flex flex-col p-0" align="center" side="top">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-xl">{scrapeData.websiteName}</h3>
                  <p className="text-sm text-gray-600">{scrapeData.url}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Change Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <Badge className={`mb-2 ${getChangeStatusColor(scrapeData.changeStatus)}`}>
                    {scrapeData.changeStatus}
                  </Badge>
                  <div className="text-sm text-gray-600">Change Status</div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      {new Date(scrapeData.scrapedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">Scraped Date</div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Hash className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900 font-mono text-xs break-all">
                      {scrapeData._id}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">Scrape ID</div>
                </div>
              </div>

              {/* AI Analysis */}
              {scrapeData.aiAnalysis && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">AI Change Analysis</h4>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="font-medium text-sm">Change Type:</span>
                        <p className="text-gray-700">{scrapeData.aiAnalysis.changeType}</p>
                      </div>
                      <div>
                        <span className="font-medium text-sm">Severity:</span>
                        <p className={getSeverityColor(scrapeData.aiAnalysis.severity)}>
                          {scrapeData.aiAnalysis.severity}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-sm">Confidence:</span>
                        <p className="text-gray-700">{Math.round(scrapeData.aiAnalysis.confidence * 100)}%</p>
                      </div>
                      <div>
                        <span className="font-medium text-sm">Impact Areas:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {scrapeData.aiAnalysis.impactAreas.map((area, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Scraped Content */}
              {scrapeData.markdown && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Scraped Content</h4>
                    <span className="text-xs text-gray-500">
                      {scrapeData.markdown.length.toLocaleString()} characters
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 max-h-[50vh] overflow-y-auto">
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({children}) => <h1 className="text-lg font-bold mb-2 text-gray-900">{children}</h1>,
                          h2: ({children}) => <h2 className="text-base font-bold mt-3 mb-1 text-gray-800">{children}</h2>,
                          h3: ({children}) => <h3 className="text-sm font-bold mt-2 mb-1 text-gray-800">{children}</h3>,
                          p: ({children}) => <p className="mb-2 leading-normal text-gray-700">{children}</p>,
                          ul: ({children}) => <ul className="mb-2 space-y-0.5 ml-4 list-disc">{children}</ul>,
                          ol: ({children}) => <ol className="mb-2 space-y-0.5 ml-4 list-decimal">{children}</ol>,
                          li: ({children}) => <li className="leading-normal text-gray-700">{children}</li>,
                          strong: ({children}) => <strong className="font-bold text-gray-900">{children}</strong>,
                          a: ({children, href}) => <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">{children}</a>,
                        }}
                      >
                        {scrapeData.markdown}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

            </div>
      </PopoverContent>
    </Popover>
  )
}
