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
  Copy,
  Download
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ComplianceTemplateEditorProps {
  isOpen: boolean
  onClose: () => void
  templateId?: string
  initialTemplate?: {
    title: string
    description?: string
    markdownContent: string
    topicKey?: string
    isDefault?: boolean
  }
  onSave: (template: {
    templateId?: string
    title: string
    description?: string
    markdownContent: string
    topicKey?: string
    isDefault?: boolean
    isActive?: boolean
  }) => Promise<void>
}

export function ComplianceTemplateEditor({
  isOpen,
  onClose,
  templateId,
  initialTemplate,
  onSave
}: ComplianceTemplateEditorProps) {
  const { addToast } = useToast()
  const [isPreviewMode, setIsPreviewMode] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  
  // Form state
  const [title, setTitle] = React.useState(initialTemplate?.title || '')
  const [description, setDescription] = React.useState(initialTemplate?.description || '')
  const [markdownContent, setMarkdownContent] = React.useState(initialTemplate?.markdownContent || getDefaultMarkdownTemplate())
  const [topicKey, setTopicKey] = React.useState(initialTemplate?.topicKey || '')

  // Reset form when template changes
  React.useEffect(() => {
    if (initialTemplate) {
      setTitle(initialTemplate.title)
      setDescription(initialTemplate.description || '')
      setMarkdownContent(initialTemplate.markdownContent)
      setTopicKey(initialTemplate.topicKey || '')
    } else {
      setTitle('')
      setDescription('')
      setMarkdownContent(getDefaultMarkdownTemplate())
      setTopicKey('')
    }
  }, [initialTemplate, templateId])

  const handleSave = async () => {
    if (!title.trim()) {
      addToast({
        title: "Title Required",
        description: "Please enter a title for the template"
      })
      return
    }

    if (!markdownContent.trim()) {
      addToast({
        title: "Content Required", 
        description: "Please enter template content"
      })
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        templateId,
        title: title.trim(),
        description: description.trim() || undefined,
        markdownContent: markdownContent.trim(),
        topicKey: topicKey.trim() || undefined,
        isDefault: initialTemplate?.isDefault,
        isActive: true
      })

      addToast({
        title: "Template Saved",
        description: `${title} template has been saved successfully`
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      addToast({
        title: "Copied",
        description: "Template content copied to clipboard"
      })
    } catch (error) {
      addToast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard"
      })
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_template.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {templateId ? 'Edit Template' : 'Create New Template'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Create or edit markdown templates that guide AI parsing of compliance information
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(markdownContent)}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
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

        {/* Template Metadata */}
        <div className="flex-shrink-0 space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="template-title" className="text-sm font-medium">
                Template Title *
              </Label>
              <Input
                id="template-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Minimum Wage Compliance Template"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="topic-key" className="text-sm font-medium">
                Topic Key (Optional)
              </Label>
              <Input
                id="topic-key"
                value={topicKey}
                onChange={(e) => setTopicKey(e.target.value)}
                placeholder="e.g., minimum_wage"
                className="mt-1"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this template is for and how it should be used..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex gap-6">
          {!isPreviewMode ? (
            // Edit Mode - Markdown Editor
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">
                  Template Content (Markdown)
                </Label>
                <div className="text-xs text-gray-500">
                  {markdownContent.length} characters
                </div>
              </div>
              <Textarea
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
                placeholder="Enter your compliance template in markdown format..."
                className="flex-1 font-mono text-sm resize-none"
              />
              <div className="mt-2 text-xs text-gray-500">
                <p>💡 <strong>Tip:</strong> Use markdown formatting (# headers, ** bold **, * lists) to structure your template.</p>
                <p>This template will guide AI parsing of compliance websites to extract structured information.</p>
              </div>
            </div>
          ) : (
            // Preview Mode
            <div className="flex-1 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <div className="bg-white border rounded-lg p-6">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({children}) => <h1 className="text-2xl font-bold mb-4 text-gray-900 border-b pb-2">{children}</h1>,
                      h2: ({children}) => <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800">{children}</h2>,
                      h3: ({children}) => <h3 className="text-lg font-medium mt-4 mb-2 text-gray-800">{children}</h3>,
                      p: ({children}) => <p className="mb-3 leading-relaxed text-gray-700">{children}</p>,
                      ul: ({children}) => <ul className="mb-3 space-y-1 ml-4 list-disc">{children}</ul>,
                      ol: ({children}) => <ol className="mb-3 space-y-1 ml-4 list-decimal">{children}</ol>,
                      li: ({children}) => <li className="leading-relaxed text-gray-700">{children}</li>,
                      strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                      em: ({children}) => <em className="italic text-gray-800">{children}</em>,
                      code: ({children}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                      blockquote: ({children}) => <blockquote className="border-l-4 border-purple-200 pl-4 italic text-gray-600 my-4">{children}</blockquote>,
                    }}
                  >
                    {markdownContent}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t pt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {title ? `Template: ${title}` : 'New Template'}
            </div>
            {!title.trim() && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                Title is required
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
              disabled={isSaving || !title.trim() || !markdownContent.trim()}
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

// Default markdown template structure
function getDefaultMarkdownTemplate(): string {
  return `# Compliance Template

## Overview
Brief description of the law/requirement, including key legislation and purpose

## Covered Employers
Who must comply with this requirement - employee thresholds, business types, etc.

## Covered Employees
Which employees are covered/protected - employment types, locations, exemptions

## What Should Employers Do?
Specific actions employers must take to comply

## Training Requirements
If applicable - training content, duration, format requirements

## Training Deadlines
If applicable - timing requirements for different employee types

## Qualified Trainers
If applicable - who can provide the training/services

## Special Requirements
Any special cases, exceptions, industry-specific requirements, or additional obligations

## Coverage Election
If applicable - optional coverage choices or rejection options

## Reciprocity/Extraterritorial Coverage
If applicable - cross-state/jurisdiction coverage rules

## Employer Responsibilities & Deadlines
Ongoing obligations, verification processes, renewal requirements, key deadlines

## Employer Notification Requirements
Required notifications to employees about rights, processes, or programs

## Posting Requirements
Required workplace postings, notices, and display requirements

## Recordkeeping Requirements
What records must be maintained, retention periods, required documentation

## Penalties for Non-Compliance
Fines, penalties, consequences, and enforcement actions

## Sources
Relevant statutes, regulations, agency websites, and official resources

---
*This template guides AI parsing of compliance information*`
}