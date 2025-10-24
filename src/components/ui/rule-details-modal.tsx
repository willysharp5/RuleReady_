'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { 
  Loader2, 
  FileText, 
  Clock, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle,
  Calendar,
  Hash,
  MapPin,
  Tag,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface RuleDetailsModalProps {
  trigger: React.ReactNode
  ruleId: string
}

export function RuleDetailsModal({ trigger, ruleId }: RuleDetailsModalProps) {
  const [open, setOpen] = React.useState(false)
  const [showFullContent, setShowFullContent] = React.useState(false)
  
  const details = useQuery(
    api.ruleDetails.getRuleDetails, 
    open ? { ruleId } : "skip"
  )

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getComplianceLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'compliant': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'non-compliant': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[90vw] max-w-4xl h-[80vh] overflow-hidden flex flex-col" 
        align="center"
        side="top"
      >
        {!details ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-gray-600">Loading rule details...</span>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-600">{details.rule.jurisdiction}</span>
                  <Badge className={`text-xs ${getPriorityColor(details.rule.priority)}`}>
                    {details.rule.priority}
                  </Badge>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {details.rule.topicLabel}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    <span className="font-mono">{details.rule.ruleId}</span>
                  </div>
                  {details.rule.updatedAt && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Updated {new Date(details.rule.updatedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {/* Rule Notes */}
              {details.rule.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {details.rule.notes}
                  </p>
                </div>
              )}

              {/* Metadata */}
              {details.rule.metadata && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Compliance Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {details.rule.metadata.coveredEmployers && (
                      <div>
                        <span className="font-medium text-gray-800">Covered Employers:</span>
                        <p className="text-gray-600 mt-1">{details.rule.metadata.coveredEmployers}</p>
                      </div>
                    )}
                    {details.rule.metadata.effectiveDate && (
                      <div>
                        <span className="font-medium text-gray-800">Effective Date:</span>
                        <p className="text-gray-600 mt-1">{details.rule.metadata.effectiveDate}</p>
                      </div>
                    )}
                    {details.rule.metadata.lastAmended && (
                      <div>
                        <span className="font-medium text-gray-800">Last Amended:</span>
                        <p className="text-gray-600 mt-1">{details.rule.metadata.lastAmended}</p>
                      </div>
                    )}
                    {details.rule.metadata.penalties && (
                      <div>
                        <span className="font-medium text-gray-800">Penalties:</span>
                        <p className="text-gray-600 mt-1">{details.rule.metadata.penalties}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Latest Report */}
              {details.latestReport && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Latest Compliance Report</h3>
                    <div className="flex items-center gap-2">
                      {details.latestReport.aiAnalysis?.severity && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getComplianceLevelColor(details.latestReport.aiAnalysis.severity)}`}
                        >
                          {details.latestReport.aiAnalysis.severity === 'low' ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {details.latestReport.aiAnalysis.severity}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(details.latestReport.generatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Overview */}
                  {details.latestReport.extractedSections?.overview && (
                    <div className="mb-4">
                      <h4 className="font-medium text-sm text-gray-800 mb-2">Overview</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">
                        {details.latestReport.extractedSections.overview}
                      </p>
                    </div>
                  )}

                  {/* AI Analysis */}
                  {details.latestReport.aiAnalysis && (
                    <div className="mb-4">
                      <h4 className="font-medium text-sm text-gray-800 mb-2">AI Analysis</h4>
                      <div className="bg-blue-50 rounded p-3 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="font-medium">Change Type:</span>
                            <span className="ml-2 text-gray-700">{details.latestReport.aiAnalysis.changeType}</span>
                          </div>
                          <div>
                            <span className="font-medium">Confidence:</span>
                            <span className="ml-2 text-gray-700">{Math.round(details.latestReport.aiAnalysis.confidence * 100)}%</span>
                          </div>
                        </div>
                        {details.latestReport.aiAnalysis.impactAreas && details.latestReport.aiAnalysis.impactAreas.length > 0 && (
                          <div className="mt-2">
                            <span className="font-medium">Impact Areas:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {details.latestReport.aiAnalysis.impactAreas.map((area, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {area}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Extracted Sections */}
                  {details.latestReport.extractedSections && (
                    <div className="mb-4">
                      <h4 className="font-medium text-sm text-gray-800 mb-2">Compliance Sections</h4>
                      <div className="space-y-3">
                        {details.latestReport.extractedSections.coveredEmployers && (
                          <div>
                            <span className="font-medium text-xs text-gray-600">Covered Employers:</span>
                            <p className="text-sm text-gray-700 mt-1">{details.latestReport.extractedSections.coveredEmployers}</p>
                          </div>
                        )}
                        {details.latestReport.extractedSections.employerResponsibilities && (
                          <div>
                            <span className="font-medium text-xs text-gray-600">Employer Responsibilities:</span>
                            <p className="text-sm text-gray-700 mt-1">{details.latestReport.extractedSections.employerResponsibilities}</p>
                          </div>
                        )}
                        {details.latestReport.extractedSections.penalties && (
                          <div>
                            <span className="font-medium text-xs text-gray-600">Penalties:</span>
                            <p className="text-sm text-gray-700 mt-1">{details.latestReport.extractedSections.penalties}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Full Content */}
                  {details.latestReport.content && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm text-gray-800">Full Report Content</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFullContent(!showFullContent)}
                          className="text-xs"
                        >
                          {showFullContent ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              Hide Content
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Show Full Content ({details.latestReport.contentLength} chars)
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {showFullContent && (
                        <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {details.latestReport.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Report History */}
              {details.reportHistory.length > 1 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Report History</h3>
                  <div className="space-y-2">
                    {details.reportHistory.slice(1, 6).map((report) => (
                      <div key={report.reportId} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-gray-500" />
                          <span className="font-mono text-xs">{report.reportId}</span>
                          {report.extractedSections?.overview && (
                            <span className="text-gray-600 truncate max-w-xs">
                              {report.extractedSections.overview.substring(0, 50)}...
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <span>{new Date(report.generatedAt).toLocaleDateString()}</span>
                          <span>({report.contentLength} chars)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Rules */}
              {details.relatedRules.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Related Rules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {details.relatedRules.map((rule) => (
                      <div key={rule.ruleId} className="p-2 border rounded text-sm hover:bg-gray-50">
                        <div className="font-medium">{rule.topicLabel}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-mono text-xs text-gray-600">{rule.ruleId}</span>
                          <Badge className={`text-xs ${getPriorityColor(rule.priority)}`}>
                            {rule.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{details.stats.totalReports} reports generated</span>
                {details.stats.lastGenerated && (
                  <span>Last: {new Date(details.stats.lastGenerated).toLocaleDateString()}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {details.rule.sourceUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="text-xs"
                  >
                    <a href={details.rule.sourceUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Official Source
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
