'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, BookOpen, ChevronDown, Check } from 'lucide-react'

interface SavedResearchItem {
  _id: string
  title: string
  jurisdiction?: string
  topic?: string
  content: string
  createdAt: number
}

interface SavedResearchSelectProps {
  value: SavedResearchItem | null
  onChange: (item: SavedResearchItem | null) => void
  items: SavedResearchItem[]
  placeholder?: string
  className?: string
}

export function SavedResearchSelect({ 
  value, 
  onChange, 
  items,
  placeholder = "Select saved research...", 
  className = ""
}: SavedResearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Filter items by search
  const filteredItems = items.filter((item: SavedResearchItem) => 
    !search || 
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.jurisdiction?.toLowerCase().includes(search.toLowerCase()) ||
    item.topic?.toLowerCase().includes(search.toLowerCase())
  )
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-sm border border-zinc-200 rounded-md bg-white hover:bg-zinc-50 flex items-center justify-between ${className}`}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <BookOpen className="h-4 w-4 text-purple-600 flex-shrink-0" />
          {value ? (
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-zinc-900">{value.title}</span>
              {(value.jurisdiction || value.topic) && (
                <span className="text-xs text-zinc-500 truncate">
                  {[value.jurisdiction, value.topic].filter(Boolean).join(' • ')}
                </span>
              )}
            </div>
          ) : (
            <span className="text-zinc-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-zinc-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg max-h-[400px] overflow-hidden flex flex-col">
          {/* Search input */}
          <div className="p-2 border-b border-zinc-200">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-3 w-3 text-zinc-400 hover:text-zinc-600" />
                </button>
              )}
            </div>
          </div>
          
          {/* Items list */}
          <div className="overflow-y-auto flex-1">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">
                No saved research found
              </div>
            ) : (
              <>
                {/* Clear selection option */}
                {value && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(null)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 border-b border-zinc-100 text-red-600"
                  >
                    Clear selection
                  </button>
                )}
                
                {filteredItems.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => {
                      onChange(item)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-purple-50 flex items-start gap-2 border-b border-zinc-100 last:border-b-0 ${
                      value?._id === item._id ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {value?._id === item._id && (
                        <Check className="h-3.5 w-3.5 text-purple-600" />
                      )}
                      {value?._id !== item._id && (
                        <div className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-sm font-medium text-zinc-900 truncate">{item.title}</div>
                      {(item.jurisdiction || item.topic) && (
                        <div className="text-xs text-zinc-500 truncate mt-0.5">
                          {[item.jurisdiction, item.topic].filter(Boolean).join(' • ')}
                        </div>
                      )}
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

