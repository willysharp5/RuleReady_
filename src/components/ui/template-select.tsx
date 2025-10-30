'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, FileText, ChevronDown } from 'lucide-react'
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"

interface TemplateSelectProps {
  value?: any // Selected template object
  onChange: (template: any) => void
  placeholder?: string
  className?: string
  includeInactive?: boolean
}

export function TemplateSelect({ 
  value, 
  onChange, 
  placeholder = "No template selected", 
  className = "",
  includeInactive = false
}: TemplateSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const templatesQuery = useQuery(api.complianceTemplates.getAllTemplates)
  const allTemplates = templatesQuery || []
  
  const topicsQuery = useQuery(api.complianceTopics.getTopics)
  const topics = topicsQuery || []
  
  // Filter templates
  const templates = includeInactive 
    ? allTemplates 
    : allTemplates.filter((t: any) => t.isActive !== false)
  
  // Filter by search
  const filtered = search
    ? templates.filter((t: any) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
        (t.topicSlug && t.topicSlug.toLowerCase().includes(search.toLowerCase()))
      ).sort((a: any, b: any) => a.title.localeCompare(b.title))
    : templates
  
  // If searching, show flat list. Otherwise, group by topic
  const showHierarchy = !search
  
  // Group templates by topic
  const templatesByTopic: { [key: string]: any[] } = {}
  
  if (showHierarchy) {
    // General templates (no topic)
    templatesByTopic['__general__'] = filtered.filter((t: any) => !t.topicSlug)
    
    // Topic-specific templates
    topics.forEach((topic: any) => {
      const topicTemplates = filtered.filter((t: any) => t.topicSlug === topic.slug)
      if (topicTemplates.length > 0) {
        templatesByTopic[topic.slug] = topicTemplates
      }
    })
  }
  
  // Get topic name from slug
  const getTopicName = (slug: string | undefined) => {
    if (!slug) return 'General (All Topics)'
    const topic = topics.find((t: any) => t.slug === slug)
    return topic ? topic.name : slug
  }
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])
  
  const handleSelect = (template: any) => {
    onChange(template)
    setIsOpen(false)
    setSearch('')
  }
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setSearch('')
  }
  
  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md ${className || 'bg-white border border-zinc-200 hover:border-zinc-300'}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {value ? (
            <>
              <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <span className="truncate">{value.title}</span>
              {value.isActive === false && (
                <span className="text-xs text-zinc-400">(Inactive)</span>
              )}
            </>
          ) : (
            <span className="text-zinc-500">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {value && (
            <X 
              className="w-4 h-4 text-zinc-400 hover:text-zinc-600" 
              onClick={handleClear}
            />
          )}
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg max-h-80 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-7 pr-7 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          
          {/* Options List */}
          <div className="overflow-y-auto">
            {search ? (
              // Flat filtered list when searching
              <>
                {filtered.map((template: any) => (
                  <button
                    key={template._id}
                    type="button"
                    onClick={() => handleSelect(template)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-purple-50"
                  >
                    <FileText className="w-3 h-3 text-purple-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{template.title}</span>
                        {template.isActive === false && (
                          <span className="text-xs text-zinc-400">(Inactive)</span>
                        )}
                      </div>
                      {template.topicSlug && (
                        <div className="text-xs text-zinc-400">{getTopicName(template.topicSlug)}</div>
                      )}
                    </div>
                  </button>
                ))}
                
                {filtered.length === 0 && (
                  <div className="px-3 py-4 text-xs text-center text-zinc-500">
                    No templates found
                  </div>
                )}
              </>
            ) : (
              // Hierarchical list by topic when not searching
              <>
                {Object.keys(templatesByTopic).map((key) => {
                  const isGeneral = key === '__general__'
                  const topicName = isGeneral ? 'General (All Topics)' : getTopicName(key)
                  const topicTemplates = templatesByTopic[key]
                  
                  if (topicTemplates.length === 0) return null
                  
                  return (
                    <div key={key}>
                      {/* Topic Header */}
                      <div className="px-3 py-1.5 bg-zinc-50 text-xs font-semibold text-zinc-700 sticky top-0">
                        {topicName} ({topicTemplates.length})
                      </div>
                      
                      {/* Templates in this topic */}
                      {topicTemplates.map((template: any) => (
                        <button
                          key={template._id}
                          type="button"
                          onClick={() => handleSelect(template)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left hover:bg-purple-50"
                        >
                          <FileText className="w-3 h-3 text-purple-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{template.title}</span>
                              {template.isActive === false && (
                                <span className="text-xs text-zinc-400">(Inactive)</span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

