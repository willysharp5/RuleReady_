import { useState } from 'react'
import { BookOpen, Search } from 'lucide-react'
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { SavedResearchSelect } from '@/components/ui/saved-research-select'
import { Label } from '@/components/ui/label'

export function SavedResearchProperties() {
  const savedResearchQuery = useQuery(api.savedResearch.getAllSavedResearch)
  const savedResearch = savedResearchQuery || []
  
  const [selectedResearch, setSelectedResearch] = useState<any>(null)
  
  // Stats
  const total = savedResearch.length
  const withTemplate = savedResearch.filter((item: any) => item.templateUsed)
  const withSources = savedResearch.filter((item: any) => item.sources && item.sources.length > 0)
  
  // Get unique jurisdictions and topics
  const uniqueJurisdictions = new Set(savedResearch.map((item: any) => item.jurisdiction).filter(Boolean))
  const uniqueTopics = new Set(savedResearch.map((item: any) => item.topic).filter(Boolean))
  
  return (
    <div className="space-y-2">
      {/* Search Saved Research */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-zinc-700 flex items-center gap-1">
          <Search className="h-3 w-3" />
          Search Saved Research
        </Label>
        <SavedResearchSelect
          value={selectedResearch}
          onChange={setSelectedResearch}
          items={savedResearch}
          placeholder="Select saved research..."
        />
        {selectedResearch && (
          <div className="text-xs text-zinc-600 bg-purple-50 p-2 rounded border border-purple-200">
            <strong>Selected:</strong> {selectedResearch.title}
          </div>
        )}
      </div>
      
      {/* Info Box */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h5 className="font-medium text-purple-900 mb-3">Saved Research</h5>
        
        {/* Overall */}
        <div className="mb-3 pb-3 border-b border-purple-200">
          <div className="text-xs text-purple-800">
            <strong>Total:</strong> {total} saved {total === 1 ? 'item' : 'items'}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs text-purple-800">
          {/* Left Column */}
          <div className="space-y-2">
            {/* By Content */}
            <div>
              <div className="font-semibold mb-1.5 text-purple-900">Content</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>With Sources:</span>
                  <span className="font-medium">{withSources.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>With Template:</span>
                  <span className="font-medium">{withTemplate.length}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-2">
            {/* By Filters */}
            <div>
              <div className="font-semibold mb-1.5 text-purple-900">Filters</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Jurisdictions:</span>
                  <span className="font-medium">{uniqueJurisdictions.size}</span>
                </div>
                <div className="flex justify-between">
                  <span>Topics:</span>
                  <span className="font-medium">{uniqueTopics.size}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Saved Research by Topic Breakdown */}
      {savedResearch.length > 0 && (
        <div>
          <label className="text-xs font-medium text-zinc-700 mb-2 block">
            Saved Research by Topic
          </label>
          <div className="space-y-1">
            {/* Items without topic */}
            {savedResearch.filter((item: any) => !item.topic).length > 0 && (
              <div className="flex items-center justify-between p-2 rounded bg-gray-50 border-gray-200 border">
                <span className="text-xs text-zinc-700">No Topic</span>
                <span className="text-xs font-semibold text-gray-600">
                  {savedResearch.filter((item: any) => !item.topic).length}
                </span>
              </div>
            )}
            
            {/* Group by topic */}
            {Array.from(uniqueTopics)
              .sort()
              .map((topicValue: any, index: number) => {
                const count = savedResearch.filter((item: any) => item.topic === topicValue).length
                // Get readable topic name
                const topicName = topicValue.replace(/_/g, ' ').split(' ')
                  .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')
                
                // Assign colors based on topic (cycling through colors)
                const colors = [
                  { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
                  { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
                  { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
                  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
                  { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-600' },
                  { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600' },
                ]
                const colorIndex = Math.abs(topicValue.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)) % colors.length
                const color = colors[colorIndex]
                
                return (
                  <div 
                    key={`topic-${topicValue}-${index}`} 
                    className={`flex items-center justify-between p-2 rounded ${color.bg} ${color.border} border`}
                  >
                    <span className="text-xs text-zinc-700 truncate">{topicName}</span>
                    <span className={`text-xs font-semibold ${color.text}`}>{count}</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {total === 0 && (
        <div className="border border-gray-200 rounded-lg p-4 text-center">
          <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-500">
            No saved research yet. Save research results from the Research tab.
          </p>
        </div>
      )}
    </div>
  )
}

