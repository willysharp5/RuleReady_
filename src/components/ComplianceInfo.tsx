import { Info, Clock, AlertTriangle, CheckCircle, Scale, Zap, AlertCircle, Timer, Turtle, FlaskConical, FileText, MapPin } from "lucide-react"
import { Tooltip } from "./ui/tooltip"
import { Badge } from "./ui/badge"

// Priority explanations
export const PRIORITY_INFO = {
  testing: {
    icon: <FlaskConical className="h-3 w-3" />,
    name: "Testing",
    description: "Development and testing priority with 15-second monitoring",
    examples: ["Development Testing", "Demo Purposes", "Quick Validation"],
    checkInterval: "15 seconds",
    reasoning: "For development and testing purposes only - not suitable for production"
  },
  critical: {
    icon: <Zap className="h-3 w-3" />,
    name: "Critical",
    description: "High-impact rules that change frequently and have severe penalties",
    examples: ["Minimum Wage", "Overtime Rules", "Workplace Safety", "Harassment Training"],
    checkInterval: "Daily",
    reasoning: "These rules change often and non-compliance can result in significant fines or legal action"
  },
  high: {
    icon: <AlertCircle className="h-3 w-3" />,
    name: "High",
    description: "Important rules with moderate change frequency and significant business impact",
    examples: ["Paid Sick Leave", "Family Medical Leave", "Workers Compensation", "Background Checks"],
    checkInterval: "Every 2 days",
    reasoning: "Important for employee benefits and rights, with moderate penalties for non-compliance"
  },
  medium: {
    icon: <Timer className="h-3 w-3" />,
    name: "Medium", 
    description: "Standard compliance requirements with periodic updates",
    examples: ["Posting Requirements", "Jury Duty Leave", "Final Pay Rules", "Voting Leave"],
    checkInterval: "Weekly",
    reasoning: "Standard compliance areas that update occasionally, manageable penalties"
  },
  low: {
    icon: <Turtle className="h-3 w-3" />,
    name: "Low",
    description: "Stable rules that rarely change with minimal immediate business impact",
    examples: ["Bereavement Leave", "Right-to-Work Laws", "Day of Rest Rules"],
    checkInterval: "Monthly", 
    reasoning: "These rules are generally stable and have lower immediate business impact"
  }
} as const

// Topic category explanations
export const TOPIC_CATEGORIES = {
  "Wages & Hours": {
    description: "Rules governing pay rates, overtime, work schedules, and meal breaks",
    topics: ["Minimum Wage", "Overtime & Hours", "Pay Frequency", "Meal & Rest Breaks"],
    businessImpact: "Direct impact on payroll and scheduling"
  },
  "Leave & Benefits": {
    description: "Employee leave policies, sick time, family leave, and benefit requirements", 
    topics: ["Paid Sick Leave", "Family Medical Leave", "Bereavement Leave", "Jury Duty Leave"],
    businessImpact: "Affects HR policies and employee benefits"
  },
  "Safety & Training": {
    description: "Workplace safety requirements and mandatory training programs",
    topics: ["Workplace Safety", "Harassment Training", "Workers Compensation"],
    businessImpact: "Critical for employee safety and legal compliance"
  },
  "Employment Practices": {
    description: "Hiring, background checks, posting requirements, and employment verification",
    topics: ["Background Checks", "E-Verify", "Posting Requirements", "Non-Compete Rules"],
    businessImpact: "Affects hiring processes and workplace policies"
  },
  "Emerging Issues": {
    description: "New and evolving areas of employment law including privacy and accommodation",
    topics: ["Biometric Privacy", "Pregnancy Accommodation", "AI Use Laws"],
    businessImpact: "Rapidly evolving areas requiring proactive monitoring"
  }
} as const

// Priority explanation component
export function PriorityBadge({ priority, showTooltip = true }: { 
  priority: keyof typeof PRIORITY_INFO
  showTooltip?: boolean 
}) {
  const info = PRIORITY_INFO[priority]
  
  const badge = (
    <Badge className={
      priority === 'testing' ? 'bg-purple-100 text-purple-800 border-purple-200' :
      priority === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
      priority === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
      priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
      'bg-green-100 text-green-800 border-green-200'
    }>
      <span className="flex items-center gap-1">
        {info.icon}
        {info.name}
      </span>
    </Badge>
  )
  
  if (!showTooltip) return badge
  
  return (
    <Tooltip 
      content={
        <div className="max-w-xs">
          <div className="font-medium mb-1">{info.icon} {info.name} Priority</div>
          <div className="text-xs mb-2">{info.description}</div>
          <div className="text-xs mb-2">
            <strong>Check Interval:</strong> {info.checkInterval}
          </div>
          <div className="text-xs">
            <strong>Examples:</strong> {info.examples.join(", ")}
          </div>
        </div>
      }
    >
      {badge}
    </Tooltip>
  )
}

// Compliance topic explanation
export function TopicBadge({ topicKey, topicName }: { 
  topicKey: string
  topicName: string 
}) {
  const getTopicInfo = (key: string) => {
    const topicMap: Record<string, { description: string, category: string, examples: string[] }> = {
      minimum_wage: {
        description: "State and federal minimum wage requirements, including tipped employee wages",
        category: "Wages & Hours",
        examples: ["Hourly wage floors", "Tipped employee minimums", "Youth wages"]
      },
      overtime: {
        description: "Overtime pay requirements, exemptions, and work hour regulations",
        category: "Wages & Hours", 
        examples: ["40-hour work week", "Time and a half pay", "Exempt vs non-exempt"]
      },
      harassment_training: {
        description: "Sexual harassment prevention training requirements for supervisors and employees",
        category: "Safety & Training",
        examples: ["Mandatory training hours", "Supervisor certification", "Annual renewals"]
      },
      paid_sick_leave: {
        description: "Earned sick time requirements, accrual rates, and usage policies",
        category: "Leave & Benefits",
        examples: ["Accrual rates", "Usage restrictions", "Carryover rules"]
      },
      background_checks: {
        description: "Employment screening requirements and ban-the-box regulations",
        category: "Employment Practices",
        examples: ["Criminal history checks", "Ban-the-box timing", "Fair chance hiring"]
      },
      workers_comp: {
        description: "Workers compensation insurance requirements and coverage mandates",
        category: "Safety & Training",
        examples: ["Insurance requirements", "Coverage levels", "Exemptions"]
      },
      posting_requirements: {
        description: "Mandatory workplace posters and employee notification requirements",
        category: "Employment Practices", 
        examples: ["Labor law posters", "Employee rights notices", "Contact information"]
      },
      // Add more as needed...
    }
    
    return topicMap[key] || {
      description: `Employment law requirements related to ${topicName.toLowerCase()}`,
      category: "Other",
      examples: ["Various compliance requirements"]
    }
  }
  
  const info = getTopicInfo(topicKey)
  
  return (
    <Badge variant="outline">
      {topicName}
    </Badge>
  )
}

// Priority explanation panel
export function PriorityExplanationPanel() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 mb-2">Understanding Compliance Priorities</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            {Object.entries(PRIORITY_INFO).map(([key, info]) => (
              <div key={key} className="bg-white rounded p-3 border border-blue-100">
                <div className="font-medium mb-1">{info.icon} {info.name}</div>
                <div className="text-xs text-gray-600 mb-2">{info.description}</div>
                <div className="text-xs">
                  <div className="flex items-center mb-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {info.checkInterval}
                  </div>
                  <div className="text-gray-500">
                    Examples: {info.examples.slice(0, 2).join(", ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Monitoring status explanation
export function MonitoringStatusInfo({ status }: { status: string }) {
  const statusInfo = {
    active: {
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      description: "Actively monitoring for changes",
      color: "text-green-600"
    },
    paused: {
      icon: <Clock className="h-4 w-4 text-yellow-500" />,
      description: "Monitoring temporarily paused",
      color: "text-yellow-600"
    },
    error: {
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      description: "Error in monitoring - needs attention",
      color: "text-red-600"
    }
  }
  
  const info = statusInfo[status as keyof typeof statusInfo] || statusInfo.active
  
  return (
    <Tooltip content={info.description}>
      <span className={`flex items-center text-xs ${info.color} cursor-help`}>
        {info.icon}
        <span className="ml-1 capitalize">{status}</span>
      </span>
    </Tooltip>
  )
}

// Jurisdiction info component
export function JurisdictionInfo({ jurisdiction }: { jurisdiction: string }) {
  const getJurisdictionInfo = (name: string) => {
    if (name === "Federal") {
      return {
        description: "Federal employment laws that apply to all US employers",
        scope: "Nationwide",
        authority: "Department of Labor, EEOC, OSHA",
        examples: ["FLSA", "FMLA", "ADA", "Title VII"]
      }
    }
    
    return {
      description: `State-specific employment laws for ${name}`,
      scope: `${name} employers and employees`,
      authority: `${name} Department of Labor`,
      examples: ["State minimum wage", "State leave laws", "Local ordinances"]
    }
  }
  
  const info = getJurisdictionInfo(jurisdiction)
  
  return (
    <Tooltip 
      content={
        <div className="max-w-sm">
          <div className="font-medium mb-1 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {jurisdiction}
          </div>
          <div className="text-xs mb-2">{info.description}</div>
          <div className="text-xs mb-1">
            <strong>Scope:</strong> {info.scope}
          </div>
          <div className="text-xs mb-1">
            <strong>Authority:</strong> {info.authority}
          </div>
          <div className="text-xs">
            <strong>Examples:</strong> {info.examples.join(", ")}
          </div>
        </div>
      }
    >
      <span className="text-blue-600 cursor-help hover:text-blue-800 flex items-center gap-1">
        <MapPin className="h-3 w-3" />
        {jurisdiction}
      </span>
    </Tooltip>
  )
}
