'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Layers, ChevronDown } from 'lucide-react'
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"

interface TopicSelectProps {
  value?: any // Selected topic object
  onChange: (topic: any) => void
  placeholder?: string
  className?: string
  includeInactive?: boolean
}

// Category color mapping
const categoryColors: { [key: string]: { bg: string; text: string; hover: string } } = {
  'Wages & Hours': { bg: 'bg-blue-500', text: 'text-blue-600', hover: 'hover:bg-blue-50' },
  'Leave & Benefits': { bg: 'bg-green-500', text: 'text-green-600', hover: 'hover:bg-green-50' },
  'Safety & Training': { bg: 'bg-red-500', text: 'text-red-600', hover: 'hover:bg-red-50' },
  'Employment Practices': { bg: 'bg-purple-500', text: 'text-purple-600', hover: 'hover:bg-purple-50' },
  'Emerging Issues': { bg: 'bg-orange-500', text: 'text-orange-600', hover: 'hover:bg-orange-50' },
  'Regulatory Compliance': { bg: 'bg-indigo-500', text: 'text-indigo-600', hover: 'hover:bg-indigo-50' },
}

export function TopicSelect({ 
  value, 
  onChange, 
  placeholder = "No topic selected", 
  className = "",
  includeInactive = false
}: TopicSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const topicsQuery = useQuery(api.complianceTopics.getTopics, { includeInactive })
  const topics = topicsQuery || []
  
  // Filter topics by search
  const filtered = search
    ? topics.filter((t: any) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.slug.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
      ).sort((a: any, b: any) => a.name.localeCompare(b.name))
    : topics
  
  // If searching, show flat list. Otherwise, organize by category
  const showHierarchy = !search
  
  // Group topics by category
  const topicsByCategory = filtered.reduce((acc: any, topic: any) => {
    if (!acc[topic.category]) acc[topic.category] = []
    acc[topic.category].push(topic)
    return acc
  }, {})
  
  // Sort topics within each category
  Object.keys(topicsByCategory).forEach(category => {
    topicsByCategory[category].sort((a: any, b: any) => a.name.localeCompare(b.name))
  })
  
  // Get sorted category names
  const categories = Object.keys(topicsByCategory).sort()
  
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
  
  const handleSelect = (topic: any) => {
    onChange(topic)
    setIsOpen(false)
    setSearch('')
  }
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setSearch('')
  }
  
  const getCategoryColor = (category: string) => {
    return categoryColors[category] || { bg: 'bg-gray-500', text: 'text-gray-600', hover: 'hover:bg-gray-50' }
  }
  
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-zinc-200 rounded-md hover:border-zinc-300 bg-white"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {value ? (
            <>
              <div className={`w-2 h-2 rounded-full ${getCategoryColor(value.category).bg} flex-shrink-0`} />
              <span className="truncate">{value.name}</span>
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
                placeholder="Search topics..."
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
                {filtered.map((topic: any) => (
                  <button
                    key={topic._id}
                    type="button"
                    onClick={() => handleSelect(topic)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left ${getCategoryColor(topic.category).hover}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${getCategoryColor(topic.category).bg} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{topic.name}</span>
                        {topic.isActive === false && (
                          <span className="text-xs text-zinc-400">(Inactive)</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400">{topic.category}</div>
                    </div>
                  </button>
                ))}
                
                {filtered.length === 0 && (
                  <div className="px-3 py-4 text-xs text-center text-zinc-500">
                    No topics found
                  </div>
                )}
              </>
            ) : (
              // Hierarchical list by category when not searching
              <>
                {categories.map((category) => (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="px-3 py-1.5 bg-zinc-50 text-xs font-semibold text-zinc-700 sticky top-0">
                      {category}
                    </div>
                    
                    {/* Topics in this category */}
                    {topicsByCategory[category].map((topic: any) => (
                      <button
                        key={topic._id}
                        type="button"
                        onClick={() => handleSelect(topic)}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-xs text-left ${getCategoryColor(category).hover}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${getCategoryColor(category).bg} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{topic.name}</span>
                            {topic.isActive === false && (
                              <span className="text-xs text-zinc-400">(Inactive)</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

