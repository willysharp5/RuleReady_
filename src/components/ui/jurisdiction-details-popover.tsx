'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Loader2, MapPin, FileText, Clock, ExternalLink, MousePointer, X, ArrowLeft, Hash, Calendar, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Tag } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface JurisdictionDetailsPopoverProps {
  trigger: React.ReactNode
  jurisdiction: string
}

export function JurisdictionDetailsPopover({ 
  trigger, 
  jurisdiction
}: JurisdictionDetailsPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedRuleId, setSelectedRuleId] = React.useState<string | null>(null)
  const [showFullContent, setShowFullContent] = React.useState(false)
  
  const details = useQuery(
    api.jurisdictionDetails.getJurisdictionDetails, 
    open ? { jurisdiction } : "skip"
  )
  
  const ruleDetails = useQuery(
    api.ruleDetails.getRuleDetails,
    selectedRuleId ? { ruleId: selectedRuleId } : "skip"
  )

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger}
      </div>
      
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Muted background overlay */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setOpen(false)}
          />
          
          {/* Modal content */}
          <div className="relative bg-white rounded-lg shadow-xl w-[90vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header with close button */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                {selectedRuleId ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedRuleId(null)
                        setShowFullContent(false)
                      }}
                      className="text-gray-500 hover:text-gray-700 mr-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <FileText className="h-6 w-6 text-purple-600" />
                    <div>
                      <h3 className="font-semibold text-xl">
                        {ruleDetails?.rule.topicLabel || 'Rule Details'}
                      </h3>
                      <p className="text-sm text-gray-600">{jurisdiction}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <MapPin className="h-6 w-6 text-purple-600" />
                    <h3 className="font-semibold text-xl">{jurisdiction}</h3>
                  </>
                )}
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
            
            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedRuleId ? (
                /* Rule Details View */
                !ruleDetails ? (
                  <div className="flex items-center gap-2 py-8 justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-gray-600">Loading rule details...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Full Templated Report */}
                    {(ruleDetails.latestReport?.structuredData?.overview || ruleDetails.latestReport?.content) ? (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">Templated Compliance Report</h4>
                          <span className="text-xs text-gray-500">
                            Generated: {new Date(ruleDetails.latestReport.generatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="bg-gray-50 rounded p-4 max-h-[60vh] overflow-y-auto">
                          <div className="text-sm leading-relaxed space-y-4">
                            {ruleDetails.latestReport.structuredData ? (
                              <div className="space-y-4">
                                {ruleDetails.latestReport.structuredData.overview && (
                                  <div>
                                    <h5 className="font-semibold text-gray-900 mb-2">Overview</h5>
                                    <p className="text-gray-800">{ruleDetails.latestReport.structuredData.overview}</p>
                                  </div>
                                )}
                                
                                {ruleDetails.latestReport.structuredData.coveredEmployers && (
                                  <div>
                                    <h5 className="font-semibold text-gray-900 mb-2">Covered Employers</h5>
                                    <p className="text-gray-800">{ruleDetails.latestReport.structuredData.coveredEmployers}</p>
                                  </div>
                                )}
                                
                                {ruleDetails.latestReport.structuredData.coveredEmployees && (
                                  <div>
                                    <h5 className="font-semibold text-gray-900 mb-2">Covered Employees</h5>
                                    <p className="text-gray-800">{ruleDetails.latestReport.structuredData.coveredEmployees}</p>
                                  </div>
                                )}
                                
                                {ruleDetails.latestReport.structuredData.employerResponsibilities && (
                                  <div>
                                    <h5 className="font-semibold text-gray-900 mb-2">Employer Responsibilities</h5>
                                    <p className="text-gray-800">{ruleDetails.latestReport.structuredData.employerResponsibilities}</p>
                                  </div>
                                )}
                                
                                {ruleDetails.latestReport.structuredData.penalties && (
                                  <div>
                                    <h5 className="font-semibold text-gray-900 mb-2">Penalties</h5>
                                    <p className="text-gray-800">{ruleDetails.latestReport.structuredData.penalties}</p>
                                  </div>
                                )}
                                
                                {ruleDetails.latestReport.structuredData.sources && (
                                  <div>
                                    <h5 className="font-semibold text-gray-900 mb-2">Sources</h5>
                                    <p className="text-gray-800">{ruleDetails.latestReport.structuredData.sources}</p>
                                  </div>
                                )}
                              </div>
                            ) : ruleDetails.latestReport.content ? (
                              <pre className="whitespace-pre-wrap font-sans text-gray-800">
                                {ruleDetails.latestReport.content}
                              </pre>
                            ) : (
                              <p className="text-gray-600 text-center py-4">No content available</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <h4 className="font-medium text-gray-900 mb-2">No Report Content Available</h4>
                        <p className="text-sm text-gray-600">
                          This compliance report hasn&apos;t been processed yet.
                        </p>
                      </div>
                    )}

                    {/* Report History */}
                    {ruleDetails.reportHistory.length > 1 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Recent Reports</h4>
                        <div className="space-y-2">
                          {ruleDetails.reportHistory.slice(0, 5).map((report) => (
                            <div key={report.reportId} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                              <div className="flex items-center gap-2">
                                <FileText className="h-3 w-3 text-gray-500" />
                                <span className="font-mono text-xs">{report.reportId}</span>
                                {report.structuredData?.overview && (
                                  <span className="text-gray-600 truncate max-w-xs">
                                    {report.structuredData.overview.substring(0, 50)}...
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

                    {/* Official Source Link */}
                    {ruleDetails.rule.sourceUrl && (
                      <div className="pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="text-xs"
                        >
                          <a href={ruleDetails.rule.sourceUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Official Source
                          </a>
                        </Button>
                        <p className="text-xs text-gray-500 mt-2 break-all">
                          {ruleDetails.rule.sourceUrl}
                        </p>
                      </div>
                    )}
                  </div>
                )
              ) : (
                /* Jurisdiction Details View */
                <div className="space-y-6">
          
          {!details ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-600">Loading compliance data...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-purple-900">{details.totalRules}</div>
                  <div className="text-xs text-purple-600">Total Rules</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-blue-900">{details.summary.topicCount}</div>
                  <div className="text-xs text-blue-600">Topics Covered</div>
                </div>
              </div>
              
              {/* Priority Breakdown */}
              <div>
                <h4 className="font-medium text-sm mb-2">Priority Breakdown</h4>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(details.summary.priorityBreakdown).map(([priority, count]) => (
                    <Badge 
                      key={priority} 
                      variant="outline" 
                      className={`text-xs ${
                        priority === 'critical' ? 'border-red-300 text-red-700' :
                        priority === 'high' ? 'border-orange-300 text-orange-700' :
                        priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                        'border-gray-300 text-gray-700'
                      }`}
                    >
                      {priority}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Compliance Reports */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">Compliance Reports</h4>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MousePointer className="h-3 w-3" />
                    <span>Click to view templated reports</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {details.rules.slice(0, 5).map((rule) => (
                    <div 
                      key={rule.ruleId}
                      onClick={() => setSelectedRuleId(rule.ruleId)}
                      className="text-xs border rounded p-2 hover:bg-purple-50 hover:border-purple-300 cursor-pointer transition-colors"
                    >
                      <div className="font-medium">{rule.topicLabel}</div>
                      <div className="text-gray-600 mt-1">
                        <span className="font-mono">{rule.ruleId}</span>
                        <Badge 
                          variant="outline" 
                          className={`ml-2 text-xs ${
                            rule.priority === 'critical' ? 'border-red-300 text-red-700' :
                            rule.priority === 'high' ? 'border-orange-300 text-orange-700' :
                            rule.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                            'border-gray-300 text-gray-700'
                          }`}
                        >
                          {rule.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Recent Reports */}
              {details.summary.hasRecentReports && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Recent Reports</h4>
                  <div className="space-y-1">
                    {details.recentReports.slice(0, 3).map((report) => (
                      <div key={report.reportId} className="text-xs flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-gray-500" />
                          <span className="font-mono">{report.ruleId}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(report.generatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
                <div className="pt-4 border-t text-xs text-gray-500">
                  Click on reports above to see templated compliance data from government websites
                </div>
              </div>
            )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
