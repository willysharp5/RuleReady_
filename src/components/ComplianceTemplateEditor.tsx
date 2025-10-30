'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, FileText, Edit3, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { TiptapEditorModal } from './TiptapEditorModal'

interface ComplianceTemplateEditorProps {
  isOpen: boolean
  onClose: () => void
  templateId?: string
  initialTemplate?: {
    title: string
    description?: string
    markdownContent: string
    topicSlug?: string
  }
  topics?: any[] // Available topics for dropdown
  onSave: (template: {
    templateId?: string
    title: string
    description?: string
    markdownContent: string
    topicSlug?: string
    isActive?: boolean
  }) => Promise<void>
}

export function ComplianceTemplateEditor({
  isOpen,
  onClose,
  templateId,
  initialTemplate,
  topics = [],
  onSave
}: ComplianceTemplateEditorProps) {
  const { addToast } = useToast()
  const [isSaving, setIsSaving] = React.useState(false)
  const [showContentEditor, setShowContentEditor] = React.useState(false)
  
  // Form state
  const [title, setTitle] = React.useState(initialTemplate?.title || '')
  const [description, setDescription] = React.useState(initialTemplate?.description || '')
  const [markdownContent, setMarkdownContent] = React.useState(initialTemplate?.markdownContent || getDefaultMarkdownTemplate())
  const [topicSlug, setTopicSlug] = React.useState(initialTemplate?.topicSlug || '')

  // Reset form when template changes
  React.useEffect(() => {
    if (initialTemplate) {
      setTitle(initialTemplate.title)
      setDescription(initialTemplate.description || '')
      setMarkdownContent(initialTemplate.markdownContent)
      setTopicSlug(initialTemplate.topicSlug || '')
    } else {
      setTitle('')
      setDescription('')
      setMarkdownContent(getDefaultMarkdownTemplate())
      setTopicSlug('')
    }
  }, [initialTemplate, templateId])

  const handleSave = async () => {
    if (!title.trim()) {
      addToast({
        title: "Validation Error",
        description: "Template title is required",
        variant: "error",
        duration: 3000
      })
      return
    }

    if (!markdownContent.trim()) {
      addToast({
        title: "Validation Error",
        description: "Template content cannot be empty",
        variant: "error",
        duration: 3000
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
        topicSlug: topicSlug.trim() || undefined,
        isActive: true
      })

      addToast({
        title: "Template Saved",
        description: `Template "${title}" has been saved successfully`,
        variant: "success",
        duration: 3000
      })

      onClose()
    } catch (error: any) {
      addToast({
        title: "Error Saving Template",
        description: error.message || "Failed to save template",
        variant: "error",
        duration: 5000
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Main Form Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Dark backdrop */}
        <div 
          className="absolute inset-0 bg-black/60"
          onClick={onClose}
        />
        
        {/* Modal content */}
        <div className="relative bg-white rounded-lg shadow-2xl w-[90vw] max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                {initialTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Form Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-sm font-medium">
                Template Title *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Minimum Wage Compliance Template"
                className="mt-1"
              />
            </div>
            
            {/* Topic Association */}
            <div>
              <Label htmlFor="topic-slug" className="text-sm font-medium">
                Associate with Topic (Optional)
              </Label>
              <select
                id="topic-slug"
                value={topicSlug}
                onChange={(e) => setTopicSlug(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">General (All Topics)</option>
                {topics.map((topic: any) => (
                  <option key={topic.slug} value={topic.slug}>
                    {topic.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500 mt-1">
                Link to a specific topic or leave general. You can create multiple templates per topic.
              </p>
            </div>
            
            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                Description (Optional)
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this template"
                className="mt-1"
              />
            </div>
            
            {/* Markdown Content */}
            <div>
              <Label className="text-sm font-medium">
                Template Content (Markdown) *
              </Label>
              <div className="mt-1 border border-zinc-200 rounded-lg p-4 bg-zinc-50 min-h-[200px]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-zinc-600">
                    {markdownContent.length} characters
                  </p>
                  <Button
                    onClick={() => setShowContentEditor(true)}
                    size="sm"
                    variant="outline"
                    className="h-8"
                  >
                    <Edit3 className="w-3 h-3 mr-2" />
                    Edit Content
                  </Button>
                </div>
                <div className="text-xs text-zinc-500 font-mono max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {markdownContent.substring(0, 500)}{markdownContent.length > 500 && '...'}
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Click "Edit Content" to open the rich text editor
              </p>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <Button
              onClick={onClose}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : initialTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Tiptap Content Editor */}
      {showContentEditor && (
        <TiptapEditorModal
          isOpen={showContentEditor}
          onClose={() => setShowContentEditor(false)}
          initialContent={markdownContent}
          title="Edit Template Content"
          onSave={(markdown) => {
            setMarkdownContent(markdown)
            setShowContentEditor(false)
            addToast({
              title: "Content Updated",
              description: "Template content has been updated. Click 'Save' to save the template.",
              variant: "success",
              duration: 3000
            })
          }}
          showSaveButton={true}
        />
      )}
    </>
  )
}

function getDefaultMarkdownTemplate() {
  return `# Compliance Template

## Overview
Brief description of the law/requirement, including key legislation and purpose

## Covered Employers
Who must comply with this requirement - employee thresholds, business types, etc.

## Covered Employees
Which employees are covered/protected - employment types, locations, exemptions

## What Should Employers Do?
Specific actions employers must take to comply

## Penalties for Non-Compliance
Fines, penalties, consequences, and enforcement actions

## Sources
Relevant statutes, regulations, agency websites, and official resources

---
*This template guides AI parsing of compliance information*`
}
