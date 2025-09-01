import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Info, ChevronDown, ChevronUp, Scale, Clock, AlertTriangle, CheckCircle, Zap, AlertCircle, Timer, Turtle, FlaskConical, DollarSign, Heart, Shield, FileText, Sparkles } from 'lucide-react'

export function ComplianceGuide() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scale className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">RuleReady Compliance System</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? (
              <>
                Hide Guide <ChevronUp className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Show Guide <ChevronDown className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
        <CardDescription className="text-blue-700">
          Monitoring 1,298+ employment law rules across all US jurisdictions with AI-powered change detection
        </CardDescription>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-6">
            {/* Priority System Explanation */}
            <div>
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Priority System & Monitoring Frequency
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-3 border border-red-200">
                  <div className="flex items-center mb-2">
                    <Badge className="bg-red-100 text-red-800">
                      <Zap className="h-3 w-3 mr-1" />
                      Critical
                    </Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span className="font-medium">Checked Daily</span>
                    </div>
                    <p className="text-gray-600">High-impact rules that change frequently</p>
                    <p className="text-gray-500">Examples: Minimum wage, overtime, workplace safety</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-orange-200">
                  <div className="flex items-center mb-2">
                    <Badge className="bg-orange-100 text-orange-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      High
                    </Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span className="font-medium">Every 2 Days</span>
                    </div>
                    <p className="text-gray-600">Important rules with moderate change frequency</p>
                    <p className="text-gray-500">Examples: Sick leave, family leave, workers comp</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-yellow-200">
                  <div className="flex items-center mb-2">
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <Timer className="h-3 w-3 mr-1" />
                      Medium
                    </Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span className="font-medium">Weekly</span>
                    </div>
                    <p className="text-gray-600">Standard compliance requirements</p>
                    <p className="text-gray-500">Examples: Posting requirements, jury duty leave</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-center mb-2">
                    <Badge className="bg-green-100 text-green-800">
                      <Turtle className="h-3 w-3 mr-1" />
                      Low
                    </Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span className="font-medium">Monthly</span>
                    </div>
                    <p className="text-gray-600">Stable rules that rarely change</p>
                    <p className="text-gray-500">Examples: Bereavement leave, voting leave</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Topic Categories */}
            <div>
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                <Scale className="h-4 w-4 mr-2" />
                Compliance Topic Categories
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 border">
                  <div className="font-medium text-sm mb-2 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                    Wages & Hours
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Pay rates, overtime, work schedules</p>
                    <p className="text-gray-500">Minimum wage, overtime pay, meal breaks</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border">
                  <div className="font-medium text-sm mb-2 flex items-center">
                    <Heart className="h-4 w-4 mr-2 text-pink-600" />
                    Leave & Benefits
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Employee leave policies and benefits</p>
                    <p className="text-gray-500">Sick leave, family leave, jury duty</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border">
                  <div className="font-medium text-sm mb-2 flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-blue-600" />
                    Safety & Training
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Workplace safety and training requirements</p>
                    <p className="text-gray-500">Harassment training, OSHA, workers comp</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border">
                  <div className="font-medium text-sm mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-600" />
                    Employment Practices
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Hiring, background checks, notices</p>
                    <p className="text-gray-500">Background checks, posting requirements</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border">
                  <div className="font-medium text-sm mb-2 flex items-center">
                    <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                    Emerging Issues
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>New and evolving compliance areas</p>
                    <p className="text-gray-500">Biometric privacy, AI use, accommodations</p>
                  </div>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div>
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                How RuleReady Works
              </h4>
              <div className="bg-white rounded-lg p-4 border space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold">1</span>
                    </div>
                    <div className="font-medium mb-1">Monitor</div>
                    <div className="text-xs text-gray-600">
                      AI continuously monitors government websites for employment law changes
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold">2</span>
                    </div>
                    <div className="font-medium mb-1">Detect</div>
                    <div className="text-xs text-gray-600">
                      Smart algorithms detect meaningful changes in compliance requirements
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold">3</span>
                    </div>
                    <div className="font-medium mb-1">Alert</div>
                    <div className="text-xs text-gray-600">
                      Get notified immediately about changes that affect your business
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
