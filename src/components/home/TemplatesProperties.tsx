import { useState } from 'react'
import { FileText, X } from 'lucide-react'
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { TemplateSelect } from '@/components/ui/template-select'

export function TemplatesProperties() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  
  const templatesQuery = useQuery(api.complianceTemplates.getAllTemplates)
  const templates = templatesQuery || []
  
  const topicsQuery = useQuery(api.complianceTopics.getTopics)
  const topics = topicsQuery || []
  
  // Stats
  const active = templates.filter((t: any) => t.isActive !== false)
  const inactive = templates.filter((t: any) => t.isActive === false)
  const withTopic = templates.filter((t: any) => t.topicSlug)
  const general = templates.filter((t: any) => !t.topicSlug)
  
  // Get topic name from slug
  const getTopicName = (slug: string | undefined) => {
    if (!slug) return 'General (All Topics)'
    const topic = topics.find((t: any) => t.slug === slug)
    return topic ? topic.name : slug
  }
  
  return (
    <div className="space-y-2">
      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h5 className="font-medium text-amber-900 mb-3">Templates</h5>
        
        {/* Overall */}
        <div className="mb-3 pb-3 border-b border-amber-200">
          <div className="text-xs text-amber-800">
            <strong>Total:</strong> {templates.length} templates
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs text-amber-800">
          {/* Left Column */}
          <div className="space-y-2">
            {/* By Status */}
            <div>
              <div className="font-semibold mb-1.5 text-amber-900">By Status</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Active:</span>
                  <span className="font-medium">{active.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Inactive:</span>
                  <span className="font-medium">{inactive.length}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-2">
            {/* By Association */}
            <div>
              <div className="font-semibold mb-1.5 text-amber-900">Association</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>With Topic:</span>
                  <span className="font-medium">{withTopic.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>General:</span>
                  <span className="font-medium">{general.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Template Selector */}
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">
          Test Template Selector
        </label>
        <TemplateSelect
          value={selectedTemplate}
          onChange={setSelectedTemplate}
          placeholder="Search or select template..."
        />
        <p className="text-xs text-zinc-500 mt-1">
          Searchable dropdown grouped by topic
        </p>
      </div>
      
      {/* Selected Template Card */}
      {selectedTemplate && (
        <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-zinc-900">
                  {selectedTemplate.title}
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {selectedTemplate.templateId}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTemplate(null)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-600">Topic:</span>
              <span className="font-medium text-zinc-900">
                {getTopicName(selectedTemplate.topicSlug)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-zinc-600">Active:</span>
              <span className={`font-medium ${selectedTemplate.isActive !== false ? 'text-green-600' : 'text-red-600'}`}>
                {selectedTemplate.isActive !== false ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            
            {selectedTemplate.description && (
              <div className="pt-2 border-t border-zinc-200">
                <span className="text-zinc-600 block mb-1">Description:</span>
                <p className="text-zinc-900 text-xs leading-relaxed">
                  {selectedTemplate.description}
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-zinc-200">
            <p className="text-xs text-zinc-600 mb-1">Data that would be sent:</p>
            <div className="bg-zinc-50 rounded p-2 font-mono text-xs">
              <div>templateId: "{selectedTemplate.templateId}"</div>
              <div>title: "{selectedTemplate.title}"</div>
              {selectedTemplate.topicSlug && (
                <div>topicSlug: "{selectedTemplate.topicSlug}"</div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Templates by Topic Breakdown */}
      {topics.length > 0 && (
        <div className="mt-4">
          <label className="block text-xs font-medium text-zinc-700 mb-2">
            Templates by Topic
          </label>
          <div className="space-y-1">
            {/* General Templates */}
            {general.length > 0 && (
              <div className="flex items-center justify-between p-2 rounded bg-gray-50 border-gray-200 border">
                <span className="text-xs text-zinc-700">General (All Topics)</span>
                <span className="text-xs font-semibold text-gray-600">{general.length}</span>
              </div>
            )}
            
            {/* Topic-Specific Templates */}
            {topics
              .filter((topic: any) => templates.some((t: any) => t.topicSlug === topic.slug))
              .sort((a: any, b: any) => a.name.localeCompare(b.name))
              .map((topic: any) => {
                const count = templates.filter((t: any) => t.topicSlug === topic.slug).length
                return (
                  <div 
                    key={topic.slug} 
                    className="flex items-center justify-between p-2 rounded bg-blue-50 border-blue-200 border"
                  >
                    <span className="text-xs text-zinc-700 truncate">{topic.name}</span>
                    <span className="text-xs font-semibold text-blue-600">{count}</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
