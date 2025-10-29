'use client'

import { useState } from 'react'
import { Layers, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"

const categoryColors: { [key: string]: string } = {
  'Wages & Hours': 'bg-blue-500',
  'Leave & Benefits': 'bg-green-500',
  'Safety & Training': 'bg-red-500',
  'Employment Practices': 'bg-purple-500',
  'Emerging Issues': 'bg-orange-500',
  'Regulatory Compliance': 'bg-indigo-500',
}

export default function TopicsFeature() {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12
  
  // Load topics from database
  const topicsQuery = useQuery(api.complianceQueries.getTopics)
  const topics = topicsQuery || []

  // Filter by search
  const filtered = topics.filter((t: any) => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.topicKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Paginate
  const totalPages = Math.ceil(filtered.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedTopics = filtered.slice(startIndex, startIndex + pageSize)
  
  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  // Get unique categories
  const categories = [...new Set(topics.map((t: any) => t.category))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Compliance Topics</h2>
        <p className="text-sm text-zinc-500 mt-1">Browse compliance rules by topic category</p>
      </div>

      {/* Search and Stats */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by topic name or category..."
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filtered.length} of {topics.length} topics
        </div>
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {paginatedTopics.map((topic: any) => (
          <div
            key={topic._id}
            className="border border-zinc-200 rounded-lg p-4 bg-white hover:border-purple-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full ${categoryColors[topic.category] || 'bg-gray-500'} flex items-center justify-center flex-shrink-0`}>
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-zinc-900">{topic.name}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{topic.category}</p>
                {topic.description && (
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{topic.description}</p>
                )}
                {topic.keywords && topic.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {topic.keywords.slice(0, 3).map((keyword: string, idx: number) => (
                      <span key={idx} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                        {keyword}
                      </span>
                    ))}
                    {topic.keywords.length > 3 && (
                      <span className="text-xs text-gray-400">+{topic.keywords.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium mb-1">No topics found</p>
          <p className="text-sm">Try a different search term</p>
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filtered.length)} of {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-gray-600 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Category Summary */}
      <div className="border-t border-zinc-200 pt-4 mt-6">
        <h3 className="font-medium text-sm text-zinc-700 mb-3">Topics by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {categories.map((category: string) => {
            const count = topics.filter((t: any) => t.category === category).length
            return (
              <div key={category} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                <span className="text-zinc-600">{category}</span>
                <span className="font-semibold text-zinc-900">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
