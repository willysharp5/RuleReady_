import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { 
  Activity, 
  Pause, 
  Play, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Zap, 
  Timer, 
  Turtle, 
  FlaskConical,
  RefreshCw,
  Settings,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

export function MonitoringStatus() {
  const [showDetails, setShowDetails] = useState(false)
  
  // Get monitoring status data
  const testingStatus = useQuery(api.testingMode.getTestingModeStatus)
  const workpoolStatus = useQuery(api.workpoolSimple.getSimpleWorkpoolStatus)
  const websites = useQuery(api.websites.getUserWebsites)
  
  // Mutations for controlling monitoring
  const pauseAllWebsites = useMutation(api.testingMode.pauseAllComplianceWebsites)
  const enableTestingMode = useMutation(api.testingMode.enableTestingMode)
  const disableTestingMode = useMutation(api.testingMode.disableTestingMode)

  if (!testingStatus || !websites) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading monitoring status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const activeWebsites = websites.filter(w => w.isActive && !w.isPaused)
  const complianceWebsites = websites.filter(w => w.complianceMetadata?.isComplianceWebsite)
  const activeComplianceWebsites = complianceWebsites.filter(w => w.isActive && !w.isPaused)

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'testing': return <FlaskConical className="h-3 w-3" />
      case 'critical': return <Zap className="h-3 w-3" />
      case 'high': return <AlertTriangle className="h-3 w-3" />
      case 'medium': return <Timer className="h-3 w-3" />
      case 'low': return <Turtle className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'testing': return 'bg-purple-100 text-purple-800'
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <CardTitle>Monitoring Status</CardTitle>
            <Badge className={
              activeComplianceWebsites.length > 0 ? 
              'bg-green-100 text-green-800' : 
              'bg-gray-100 text-gray-800'
            }>
              {activeComplianceWebsites.length > 0 ? 'Active' : 'Paused'}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
        </div>
        <CardDescription>
          System monitoring status and active job information
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Quick Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{activeComplianceWebsites.length}</div>
            <div className="text-xs text-gray-600">Active Monitoring</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{complianceWebsites.length - activeComplianceWebsites.length}</div>
            <div className="text-xs text-gray-600">Paused Websites</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{workpoolStatus?.metrics.successfulJobs24h || 0}</div>
            <div className="text-xs text-gray-600">Successful Jobs (24h)</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{workpoolStatus?.metrics.changesDetected24h || 0}</div>
            <div className="text-xs text-gray-600">Changes Detected</div>
          </div>
        </div>

        {/* Active Jobs Filter */}
        {activeComplianceWebsites.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium mb-3 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Active Monitoring Jobs
            </h4>
            <div className="space-y-2">
              {activeComplianceWebsites.map((website) => {
                const lastChecked = website.lastChecked || website.createdAt
                const timeSinceCheck = Math.round((Date.now() - lastChecked) / 1000 / 60) // minutes
                const isDue = timeSinceCheck >= website.checkInterval
                
                return (
                  <div key={website._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-1 rounded ${getPriorityColor(website.complianceMetadata?.priority || 'medium')}`}>
                        {getPriorityIcon(website.complianceMetadata?.priority || 'medium')}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{website.name}</div>
                        <div className="text-xs text-gray-500">
                          {website.complianceMetadata?.jurisdiction} • {website.complianceMetadata?.topicKey?.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Interval</div>
                        <div className="font-medium">{website.checkInterval}m</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Last Check</div>
                        <div className="font-medium">{timeSinceCheck}m ago</div>
                      </div>
                      <div className="text-center">
                        <Badge className={isDue ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}>
                          {isDue ? 'Due' : 'Scheduled'}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Pause this specific website
                          // pauseWebsite({ websiteId: website._id, isPaused: true })
                        }}
                      >
                        <Pause className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* System Controls */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
          <div>
            <h4 className="font-medium">System Controls</h4>
            <p className="text-sm text-gray-600">
              {testingStatus.isTestingMode ? 
                'Testing mode active with limited monitoring' : 
                'All monitoring paused for safety'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {testingStatus.isTestingMode ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => disableTestingMode()}
              >
                <Pause className="h-3 w-3 mr-1" />
                Stop Testing
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => enableTestingMode({ testWebsiteCount: 5 })}
              >
                <Play className="h-3 w-3 mr-1" />
                Start Testing (5 sites)
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => pauseAllWebsites()}
            >
              <Pause className="h-3 w-3 mr-1" />
              Pause All
            </Button>
          </div>
        </div>

        {/* Detailed Status */}
        {showDetails && (
          <div className="space-y-4">
            {/* Job Performance Metrics */}
            {workpoolStatus && (
              <div>
                <h4 className="font-medium mb-3 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Job Performance (Last 24 Hours)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2 border rounded">
                    <div className="text-lg font-semibold">{workpoolStatus.metrics.totalJobs24h}</div>
                    <div className="text-xs text-gray-500">Total Jobs</div>
                  </div>
                  <div className="text-center p-2 border rounded">
                    <div className="text-lg font-semibold text-green-600">{workpoolStatus.metrics.successfulJobs24h}</div>
                    <div className="text-xs text-gray-500">Successful</div>
                  </div>
                  <div className="text-center p-2 border rounded">
                    <div className="text-lg font-semibold text-red-600">{workpoolStatus.metrics.failedJobs24h}</div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                  <div className="text-center p-2 border rounded">
                    <div className="text-lg font-semibold text-blue-600">{workpoolStatus.metrics.averageProcessingTime.toFixed(0)}ms</div>
                    <div className="text-xs text-gray-500">Avg Time</div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Job Activity */}
            {workpoolStatus?.recentActivity && workpoolStatus.recentActivity.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Recent Job Activity
                </h4>
                <div className="space-y-2">
                  {workpoolStatus.recentActivity.slice(0, 5).map((job, i) => {
                    const timeAgo = Math.round((Date.now() - job.processedAt) / 1000 / 60)
                    const statusIcon = job.success ? 
                      <CheckCircle className="h-3 w-3 text-green-600" /> : 
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                    
                    return (
                      <div key={i} className="flex items-center justify-between p-2 border rounded text-sm">
                        <div className="flex items-center space-x-2">
                          {statusIcon}
                          <span className="font-medium">{job.ruleId}</span>
                          {job.changesDetected && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">Changes</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{timeAgo}m ago</span>
                          <span>{job.processingTime}ms</span>
                          <Badge className="text-xs">{job.mode}</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* System Health */}
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                System Health
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded">
                  <div className="font-medium text-sm mb-2">Monitoring Status</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Testing Mode:</span>
                      <span className={testingStatus.isTestingMode ? 'text-green-600' : 'text-gray-500'}>
                        {testingStatus.isTestingMode ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Websites:</span>
                      <span>{testingStatus.activeWebsites}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paused Websites:</span>
                      <span>{testingStatus.pausedWebsites}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 border rounded">
                  <div className="font-medium text-sm mb-2">Performance</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Success Rate:</span>
                      <span className="text-green-600">
                        {workpoolStatus?.metrics.totalJobs24h ? 
                          Math.round((workpoolStatus.metrics.successfulJobs24h / workpoolStatus.metrics.totalJobs24h) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Response:</span>
                      <span>{workpoolStatus?.metrics.averageProcessingTime.toFixed(0) || 0}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>System Load:</span>
                      <span className={activeComplianceWebsites.length > 10 ? 'text-red-600' : 'text-green-600'}>
                        {activeComplianceWebsites.length > 10 ? 'High' : 'Low'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cron Job Status */}
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Scheduled Jobs Status
              </h4>
              <div className="p-3 border rounded bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span>Website Checking:</span>
                    <Badge className="bg-red-100 text-red-800 text-xs">DISABLED</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Compliance Monitoring:</span>
                    <Badge className="bg-red-100 text-red-800 text-xs">DISABLED</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Embedding Jobs:</span>
                    <Badge className="bg-red-100 text-red-800 text-xs">DISABLED</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Cleanup Jobs:</span>
                    <Badge className="bg-red-100 text-red-800 text-xs">DISABLED</Badge>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  ✅ All automatic scheduling disabled to prevent rate limiting
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warning if too many active */}
        {activeComplianceWebsites.length > 10 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">High Monitoring Load</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              {activeComplianceWebsites.length} websites are active. Consider reducing to 5-10 for testing to prevent rate limiting.
            </p>
          </div>
        )}

        {/* Safe State Indicator */}
        {activeComplianceWebsites.length === 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">System in Safe State</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              All monitoring is paused. No requests are being made to government websites.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

