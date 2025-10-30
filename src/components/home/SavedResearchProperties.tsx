import { BookOpen } from 'lucide-react'
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"

export function SavedResearchProperties() {
  const savedResearchQuery = useQuery(api.savedResearch.getAllSavedResearch)
  const savedResearch = savedResearchQuery || []
  
  // Stats
  const total = savedResearch.length
  const withJurisdiction = savedResearch.filter((item: any) => item.jurisdiction)
  const withTopic = savedResearch.filter((item: any) => item.topic)
  const withTemplate = savedResearch.filter((item: any) => item.templateUsed)
  const withSources = savedResearch.filter((item: any) => item.sources && item.sources.length > 0)
  
  // Get unique jurisdictions and topics
  const uniqueJurisdictions = new Set(savedResearch.map((item: any) => item.jurisdiction).filter(Boolean))
  const uniqueTopics = new Set(savedResearch.map((item: any) => item.topic).filter(Boolean))
  
  // Get most recent
  const mostRecent = savedResearch.length > 0 
    ? savedResearch[0] // Already sorted by createdAt desc
    : null
  
  return (
    <div className="space-y-2">
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
      
      {/* Most Recent */}
      {mostRecent && (
        <div className="border border-gray-200 rounded-lg p-3">
          <h5 className="font-medium text-gray-900 mb-2 text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Most Recent
          </h5>
          <div className="space-y-2 text-xs">
            <div className="font-medium text-gray-900 line-clamp-2">
              {mostRecent.title}
            </div>
            <div className="text-gray-500">
              {new Date(mostRecent.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </div>
            {mostRecent.jurisdiction && (
              <div className="text-gray-600">
                <strong>Jurisdiction:</strong> {mostRecent.jurisdiction}
              </div>
            )}
            {mostRecent.topic && (
              <div className="text-gray-600">
                <strong>Topic:</strong> {mostRecent.topic}
              </div>
            )}
            {mostRecent.sources && mostRecent.sources.length > 0 && (
              <div className="text-gray-600">
                <strong>Sources:</strong> {mostRecent.sources.length}
              </div>
            )}
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

