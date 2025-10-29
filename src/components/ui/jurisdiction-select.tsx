'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, MapPin, Building2, Landmark, ChevronDown } from 'lucide-react'
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"

interface JurisdictionSelectProps {
  value?: any // Selected jurisdiction object
  onChange: (jurisdiction: any) => void
  placeholder?: string
  className?: string
}

export function JurisdictionSelect({ value, onChange, placeholder = "No jurisdiction selected", className = "" }: JurisdictionSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const jurisdictionsQuery = useQuery(api.complianceQueries.getJurisdictions)
  const jurisdictions = jurisdictionsQuery || []
  
  // Filter jurisdictions by search
  const filtered = search
    ? jurisdictions.filter((j: any) =>
        j.name.toLowerCase().includes(search.toLowerCase()) ||
        j.code.toLowerCase().includes(search.toLowerCase()) ||
        (j.displayName && j.displayName.toLowerCase().includes(search.toLowerCase()))
      ).sort((a: any, b: any) => {
        // Sort by level then name
        if (a.level !== b.level) {
          const levelOrder: any = { federal: 0, state: 1, city: 2 }
          return levelOrder[a.level] - levelOrder[b.level]
        }
        return a.name.localeCompare(b.name)
      })
    : jurisdictions
  
  // If searching, show flat list. Otherwise, organize hierarchically
  const showHierarchy = !search
  
  const federal = filtered.find((j: any) => j.level === 'federal')
  const states = filtered
    .filter((j: any) => j.level === 'state')
    .sort((a: any, b: any) => a.name.localeCompare(b.name))
  
  const citiesByState = filtered
    .filter((j: any) => j.level === 'city')
    .reduce((acc: any, city: any) => {
      if (!acc[city.stateCode]) acc[city.stateCode] = []
      acc[city.stateCode].push(city)
      return acc
    }, {})
  
  Object.keys(citiesByState).forEach(stateCode => {
    citiesByState[stateCode].sort((a: any, b: any) => a.name.localeCompare(b.name))
  })
  
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
  
  const handleSelect = (jurisdiction: any) => {
    onChange(jurisdiction)
    setIsOpen(false)
    setSearch('')
  }
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setSearch('')
  }
  
  const getIcon = (level: string) => {
    if (level === 'federal') return <Landmark className="w-4 h-4 text-blue-600" />
    if (level === 'state') return <MapPin className="w-4 h-4 text-green-600" />
    return <Building2 className="w-4 h-4 text-orange-600" />
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
              {getIcon(value.level)}
              <span className="truncate">{value.displayName || value.name}</span>
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
                placeholder="Search..."
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
                {filtered.map((j: any) => (
                  <button
                    key={j.code}
                    type="button"
                    onClick={() => handleSelect(j)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left ${
                      j.level === 'federal' ? 'hover:bg-blue-50' :
                      j.level === 'state' ? 'hover:bg-green-50' :
                      'hover:bg-orange-50'
                    }`}
                  >
                    {getIcon(j.level)}
                    <span>{j.displayName || j.name}</span>
                    <span className="ml-auto text-zinc-400 text-xs">{j.code}</span>
                  </button>
                ))}
                
                {filtered.length === 0 && (
                  <div className="px-3 py-4 text-xs text-center text-zinc-500">
                    No jurisdictions found
                  </div>
                )}
              </>
            ) : (
              // Hierarchical list when not searching
              <>
                {/* Federal */}
                {federal && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSelect(federal)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-blue-50 text-left"
                    >
                      <Landmark className="w-4 h-4 text-blue-600" />
                      <span>{federal.name}</span>
                    </button>
                    <div className="border-t border-zinc-100" />
                  </>
                )}
                
                {/* States and Cities */}
                {states.map((state: any) => (
                  <div key={state.code}>
                    <button
                      type="button"
                      onClick={() => handleSelect(state)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-green-50 text-left font-medium"
                    >
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span>{state.name}</span>
                    </button>
                    
                    {/* Cities under this state */}
                    {citiesByState[state.code]?.map((city: any) => (
                      <button
                        key={city.code}
                        type="button"
                        onClick={() => handleSelect(city)}
                        className="w-full flex items-center gap-2 pl-8 pr-3 py-2 text-xs hover:bg-orange-50 text-left"
                      >
                        <Building2 className="w-3 h-3 text-orange-600" />
                        <span>{city.name}</span>
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

