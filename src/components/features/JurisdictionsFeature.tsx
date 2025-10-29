'use client'

import { useState } from 'react'
import { MapPin, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"

export default function JurisdictionsFeature() {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12
  
  // Load jurisdictions from database
  const jurisdictionsQuery = useQuery(api.complianceQueries.getJurisdictions)
  const jurisdictions = jurisdictionsQuery || []

  // Filter by search
  const filtered = jurisdictions.filter((j: any) => 
    j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.type.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Paginate
  const totalPages = Math.ceil(filtered.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedJurisdictions = filtered.slice(startIndex, startIndex + pageSize)
  
  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Jurisdictions</h2>
        <p className="text-sm text-zinc-500 mt-1">View all US jurisdictions and their compliance rules</p>
      </div>

      {/* Search and Stats */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name, code, or type..."
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filtered.length} of {jurisdictions.length} jurisdictions
        </div>
      </div>

      {/* Jurisdictions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {paginatedJurisdictions.map((jurisdiction: any) => (
          <div
            key={jurisdiction._id}
            className="border border-zinc-200 rounded-lg p-4 bg-white hover:border-purple-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-zinc-900">{jurisdiction.name}</h3>
                <p className="text-xs text-zinc-500 mt-0.5 uppercase">{jurisdiction.code}</p>
                <span className={`
                  inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full
                  ${jurisdiction.type === 'federal' 
                    ? 'bg-blue-100 text-blue-700' 
                    : jurisdiction.type === 'state'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                  }
                `}>
                  {jurisdiction.type}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium mb-1">No jurisdictions found</p>
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
    </div>
  )
}
