'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Save, 
  X, 
  FileText, 
  Eye, 
  Edit3, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  BookOpen,
  Scale,
  Clock,
  Users,
  Building,
  AlertTriangle,
  FileCheck,
  Gavel
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ComplianceTemplateEditorProps {
  isOpen: boolean
  onClose: () => void
  topicKey: string
  topicName: string
  initialTemplate?: {
    templateContent: string
    sections: {
      overview: string
      coveredEmployers: string
      coveredEmployees: string
      employerResponsibilities: string
      trainingRequirements?: string
      trainingDeadlines?: string
      qualifiedTrainers?: string
      specialRequirements?: string
      coverageElection?: string
      reciprocity?: string
      employerDeadlines: string
      notificationRequirements?: string
      postingRequirements?: string
      recordkeepingRequirements: string
      penalties: string
      sources: string
    }
    legalCounselNotes?: string
  }
  onSave: (template: any) => Promise<void>
}

const sectionConfig = [
  { key: 'overview', label: 'Overview', icon: Info, required: true, description: 'Brief description of the law/requirement' },
  { key: 'coveredEmployers', label: 'Covered Employers', icon: Building, required: true, description: 'Who must comply with this requirement' },
  { key: 'coveredEmployees', label: 'Covered Employees', icon: Users, required: true, description: 'Which employees are covered/protected' },
  { key: 'employerResponsibilities', label: 'Employer Responsibilities', icon: CheckCircle, required: true, description: 'Specific actions employers must take' },
  { key: 'trainingRequirements', label: 'Training Requirements', icon: BookOpen, required: false, description: 'Training content and format requirements' },
  { key: 'trainingDeadlines', label: 'Training Deadlines', icon: Clock, required: false, description: 'Timing requirements for training' },
  { key: 'qualifiedTrainers', label: 'Qualified Trainers', icon: Users, required: false, description: 'Who can provide training/services' },
  { key: 'specialRequirements', label: 'Special Requirements', icon: AlertCircle, required: false, description: 'Exceptions and special cases' },
  { key: 'coverageElection', label: 'Coverage Election', icon: FileCheck, required: false, description: 'Optional coverage choices' },
  { key: 'reciprocity', label: 'Reciprocity/Extraterritorial', icon: Scale, required: false, description: 'Cross-jurisdiction rules' },
  { key: 'employerDeadlines', label: 'Employer Deadlines', icon: Clock, required: true, description: 'Ongoing obligations and deadlines' },
  { key: 'notificationRequirements', label: 'Notification Requirements', icon: AlertTriangle, required: false, description: 'Required employee notifications' },
  { key: 'postingRequirements', label: 'Posting Requirements', icon: FileText, required: false, description: 'Workplace posting requirements' },
  { key: 'recordkeepingRequirements', label: 'Recordkeeping Requirements', icon: FileCheck, required: true, description: 'Record maintenance requirements' },
  { key: 'penalties', label: 'Penalties for Non-Compliance', icon: Gavel, required: true, description: 'Fines and consequences' },
  { key: 'sources', label: 'Sources', icon: BookOpen, required: true, description: 'Official resources and statutes' },
];

export function ComplianceTemplateEditor({
  isOpen,
  onClose,
  topicKey,
  topicName,
  initialTemplate,
  onSave
}: ComplianceTemplateEditorProps) {
  const { addToast } = useToast()
  const [isPreviewMode, setIsPreviewMode] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [sections, setSections] = React.useState(() => {
    if (initialTemplate) {
      return initialTemplate.sections
    }
    
    // Initialize with empty sections
    const emptySections: any = {}
    sectionConfig.forEach(section => {
      emptySections[section.key] = ''
    })
    return emptySections
  })
  const [legalCounselNotes, setLegalCounselNotes] = React.useState(initialTemplate?.legalCounselNotes || '')

  const updateSection = (key: string, value: string) => {
    setSections(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Generate full template content
      const templateContent = generateTemplateContent(sections, topicName)
      
      await onSave({
        templateId: topicKey,
        topicKey,
        topicName,
        templateContent,
        sections,
        legalCounselNotes,
        isDefault: true
      })

      addToast({
        title: "Template Saved",
        description: `${topicName} template has been saved successfully`
      })
      
      onClose()
    } catch (error) {
      addToast({
        title: "Save Failed",
        description: "Failed to save template. Please try again."
      })
    } finally {
      setIsSaving(false)
    }
  }

  const generateTemplateContent = (sections: any, topicName: string) => {
    let content = `${topicName} Compliance Template\n\n`
    
    sectionConfig.forEach(config => {
      const sectionContent = sections[config.key]
      if (sectionContent && sectionContent.trim()) {
        content += `${config.label}\n${sectionContent.trim()}\n\n`
      }
    })
    
    if (legalCounselNotes.trim()) {
      content += `Legal Counsel Notes\n${legalCounselNotes.trim()}\n\n`
    }
    
    content += `---\nGenerated on: ${new Date().toISOString()}\nProcessing method: RuleReady Template Editor`
    
    return content
  }

  const requiredSections = sectionConfig.filter(s => s.required)
  const optionalSections = sectionConfig.filter(s => !s.required)
  const completedRequired = requiredSections.filter(s => sections[s.key]?.trim()).length
  const completionPercentage = Math.round((completedRequired / requiredSections.length) * 100)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {topicName} Template Editor
              </DialogTitle>
              <DialogDescription className="mt-1">
                Create comprehensive legal counsel guidance for {topicName.toLowerCase()} compliance
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">
                {completedRequired}/{requiredSections.length} required sections ({completionPercentage}%)
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="gap-2"
              >
                {isPreviewMode ? (
                  <>
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Preview
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-6">
          {!isPreviewMode ? (
            // Edit Mode
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* Required Sections */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Required Sections
                </h3>
                <div className="space-y-4">
                  {requiredSections.map((config) => {
                    const Icon = config.icon
                    return (
                      <div key={config.key} className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <Icon className="h-4 w-4 text-gray-600" />
                          {config.label}
                          <span className="text-red-500">*</span>
                        </Label>
                        <p className="text-xs text-gray-500">{config.description}</p>
                        <Textarea
                          value={sections[config.key] || ''}
                          onChange={(e) => updateSection(config.key, e.target.value)}
                          placeholder={`Enter ${config.label.toLowerCase()} details for legal counsel...`}
                          className="min-h-[100px] resize-y"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Optional Sections */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  Optional Sections
                </h3>
                <div className="space-y-4">
                  {optionalSections.map((config) => {
                    const Icon = config.icon
                    return (
                      <div key={config.key} className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <Icon className="h-4 w-4 text-gray-600" />
                          {config.label}
                        </Label>
                        <p className="text-xs text-gray-500">{config.description}</p>
                        <Textarea
                          value={sections[config.key] || ''}
                          onChange={(e) => updateSection(config.key, e.target.value)}
                          placeholder={`Enter ${config.label.toLowerCase()} details (optional)...`}
                          className="min-h-[80px] resize-y"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Legal Counsel Notes */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Scale className="h-5 w-5 text-purple-500" />
                  Legal Counsel Notes
                </h3>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Special guidance and priority areas for legal counsel
                  </Label>
                  <Textarea
                    value={legalCounselNotes}
                    onChange={(e) => setLegalCounselNotes(e.target.value)}
                    placeholder="Enter special notes, priority areas, and key considerations for legal counsel..."
                    className="min-h-[100px] resize-y"
                  />
                </div>
              </div>
            </div>
          ) : (
            // Preview Mode
            <div className="flex-1 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h1 className="text-xl font-bold text-gray-900 mb-4">{topicName} Compliance Template</h1>
                  
                  {sectionConfig.map((config) => {
                    const content = sections[config.key]
                    if (!content?.trim()) return null
                    
                    const Icon = config.icon
                    return (
                      <div key={config.key} className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <Icon className="h-5 w-5 text-gray-600" />
                          {config.label}
                        </h2>
                        <div className="text-gray-700 leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )
                  })}
                  
                  {legalCounselNotes.trim() && (
                    <div className="mt-8 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h2 className="text-lg font-semibold text-purple-800 mb-2 flex items-center gap-2">
                        <Scale className="h-5 w-5" />
                        Legal Counsel Notes
                      </h2>
                      <div className="text-purple-700">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {legalCounselNotes}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t pt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Template for: <span className="font-medium">{topicName}</span>
            </div>
            {completionPercentage < 100 && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                {requiredSections.length - completedRequired} required sections remaining
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || completionPercentage < 100}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Template
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
