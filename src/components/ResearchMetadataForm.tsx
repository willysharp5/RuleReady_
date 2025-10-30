'use client'

import { Input } from '@/components/ui/input'
import { JurisdictionSelect } from '@/components/ui/jurisdiction-select'
import { TopicSelect } from '@/components/ui/topic-select'
import { TemplateSelect } from '@/components/ui/template-select'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

interface ResearchMetadataFormProps {
  title: string
  onTitleChange: (title: string) => void
  jurisdiction: string
  onJurisdictionChange: (jurisdiction: string) => void
  topic: string
  onTopicChange: (topic: string) => void
  template: string
  onTemplateChange: (template: string) => void
}

export function ResearchMetadataForm({
  title,
  onTitleChange,
  jurisdiction,
  onJurisdictionChange,
  topic,
  onTopicChange,
  template,
  onTemplateChange
}: ResearchMetadataFormProps) {
  // Load data
  const jurisdictionsQuery = useQuery(api.complianceQueries.getJurisdictions)
  const topicsQuery = useQuery(api.complianceTopics.getTopics)
  const templatesQuery = useQuery(api.complianceTemplates.getAllTemplates)
  
  const jurisdictions = jurisdictionsQuery || []
  const topics = topicsQuery || []
  const templates = templatesQuery || []
  
  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Research title..."
          className="text-sm"
        />
      </div>
      
      {/* Jurisdiction */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction</label>
        <JurisdictionSelect
          value={jurisdictions?.find(j => 
            j.name === jurisdiction || 
            j.displayName === jurisdiction
          ) || null}
          onChange={(j) => onJurisdictionChange(j?.name || '')}
          placeholder="None"
        />
      </div>
      
      {/* Topic */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
        <TopicSelect
          value={topics?.find(t => t.name === topic || t.slug === topic) || null}
          onChange={(t) => onTopicChange(t?.name || '')}
          placeholder="None"
        />
      </div>
      
      {/* Template */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Template Used</label>
        <TemplateSelect
          value={templates?.find(t => t.templateId === template || t.title === template) || null}
          onChange={(t) => onTemplateChange(t?.templateId || '')}
          placeholder="None"
        />
      </div>
    </div>
  )
}

