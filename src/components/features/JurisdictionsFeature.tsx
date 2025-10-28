'use client'

import { useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Jurisdiction {
  id: string
  name: string
  rulesCount: number
  status: 'active' | 'inactive'
}

export default function JurisdictionsFeature() {
  const [searchQuery, setSearchQuery] = useState('')
  
  const jurisdictions: Jurisdiction[] = [
    { id: '1', name: 'California', rulesCount: 245, status: 'active' },
    { id: '2', name: 'New York', rulesCount: 198, status: 'active' },
    { id: '3', name: 'Texas', rulesCount: 156, status: 'active' },
    { id: '4', name: 'Florida', rulesCount: 134, status: 'active' },
    { id: '5', name: 'Illinois', rulesCount: 123, status: 'active' },
    { id: '6', name: 'Pennsylvania', rulesCount: 112, status: 'active' },
  ]

  const filtered = jurisdictions.filter(j => 
    j.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Jurisdictions</h2>
        <p className="text-sm text-zinc-500 mt-1">View all US jurisdictions and their compliance rules</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search jurisdictions..."
          className="pl-10"
        />
      </div>

      {/* Jurisdictions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((jurisdiction) => (
          <div
            key={jurisdiction.id}
            className="border border-zinc-200 rounded-lg p-4 bg-white hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-zinc-900">{jurisdiction.name}</h3>
                <p className="text-sm text-zinc-500 mt-0.5">{jurisdiction.rulesCount} rules</p>
                <span className={`
                  inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full
                  ${jurisdiction.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-zinc-100 text-zinc-600'
                  }
                `}>
                  {jurisdiction.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No jurisdictions found</p>
        </div>
      )}
    </div>
  )
}

