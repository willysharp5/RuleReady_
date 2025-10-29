import { useState } from 'react'
import { MapPin, Building2, Landmark, X } from 'lucide-react'
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"

export function JurisdictionsProperties() {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<any>(null)
  
  const jurisdictionsQuery = useQuery(api.complianceQueries.getJurisdictions)
  const jurisdictions = jurisdictionsQuery || []
  
  // Organize hierarchically
  const federal = jurisdictions.find((j: any) => j.level === 'federal')
  const states = jurisdictions
    .filter((j: any) => j.level === 'state')
    .sort((a: any, b: any) => a.name.localeCompare(b.name))
  
  const citiesByState = jurisdictions
    .filter((j: any) => j.level === 'city')
    .reduce((acc: any, city: any) => {
      if (!acc[city.stateCode]) acc[city.stateCode] = []
      acc[city.stateCode].push(city)
      return acc
    }, {})
  
  // Sort cities within each state
  Object.keys(citiesByState).forEach(stateCode => {
    citiesByState[stateCode].sort((a: any, b: any) => a.name.localeCompare(b.name))
  })
  
  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value
    if (!code) {
      setSelectedJurisdiction(null)
      return
    }
    
    const selected = jurisdictions.find((j: any) => j.code === code)
    setSelectedJurisdiction(selected)
  }
  
  return (
    <div className="space-y-2">
      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-900 mb-2">Jurisdictions</h5>
        <div className="text-xs text-blue-800 space-y-1">
          <div><strong>Total:</strong> {jurisdictions.length} jurisdictions</div>
          <div><strong>States:</strong> {states.length}</div>
          <div><strong>Cities:</strong> {jurisdictions.filter((j: any) => j.level === 'city').length}</div>
        </div>
      </div>
      
      {/* Hierarchical Dropdown */}
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">
          Test Jurisdiction Selector
        </label>
        <select
          value={selectedJurisdiction?.code || ''}
          onChange={handleSelect}
          className="w-full px-2 py-1.5 text-xs border border-zinc-200 rounded-md"
        >
          <option value="">All Jurisdictions (Federal)</option>
          
          {/* Federal */}
          {federal && (
            <option value={federal.code}>
              🏛️ {federal.name}
            </option>
          )}
          
          <option disabled>──────────</option>
          
          {/* States with nested cities */}
          {states.map((state: any) => (
            <optgroup key={state.code} label={state.name}>
              <option value={state.code}>
                📍 {state.name}
              </option>
              
              {/* Cities under this state */}
              {citiesByState[state.code]?.map((city: any) => (
                <option key={city.code} value={city.code}>
                  &nbsp;&nbsp;🏙️ {city.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="text-xs text-zinc-500 mt-1">
          Select to see hierarchical structure
        </p>
      </div>
      
      {/* Selected Jurisdiction Card */}
      {selectedJurisdiction && (
        <div className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-2">
              {selectedJurisdiction.level === 'federal' && (
                <Landmark className="h-5 w-5 text-blue-600 mt-0.5" />
              )}
              {selectedJurisdiction.level === 'state' && (
                <MapPin className="h-5 w-5 text-green-600 mt-0.5" />
              )}
              {selectedJurisdiction.level === 'city' && (
                <Building2 className="h-5 w-5 text-orange-600 mt-0.5" />
              )}
              <div>
                <h4 className="font-semibold text-sm text-zinc-900">
                  {selectedJurisdiction.displayName || selectedJurisdiction.name}
                </h4>
                <p className="text-xs text-zinc-500 uppercase mt-0.5">
                  {selectedJurisdiction.code}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedJurisdiction(null)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-600">Level:</span>
              <span className={`font-medium ${
                selectedJurisdiction.level === 'federal' ? 'text-blue-600' :
                selectedJurisdiction.level === 'state' ? 'text-green-600' :
                'text-orange-600'
              }`}>
                {selectedJurisdiction.level}
              </span>
            </div>
            
            {selectedJurisdiction.parentCode && (
              <div className="flex justify-between">
                <span className="text-zinc-600">Parent:</span>
                <span className="font-medium text-zinc-900">
                  {jurisdictions.find((j: any) => j.code === selectedJurisdiction.parentCode)?.name || selectedJurisdiction.parentCode}
                </span>
              </div>
            )}
            
            {selectedJurisdiction.stateCode && selectedJurisdiction.level === 'city' && (
              <div className="flex justify-between">
                <span className="text-zinc-600">State:</span>
                <span className="font-medium text-zinc-900">
                  {jurisdictions.find((j: any) => j.code === selectedJurisdiction.stateCode)?.name || selectedJurisdiction.stateCode}
                </span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-zinc-600">Active:</span>
              <span className={`font-medium ${selectedJurisdiction.isActive !== false ? 'text-green-600' : 'text-red-600'}`}>
                {selectedJurisdiction.isActive !== false ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-zinc-600">Has Laws:</span>
              <span className={`font-medium ${selectedJurisdiction.hasEmploymentLaws !== false ? 'text-green-600' : 'text-gray-500'}`}>
                {selectedJurisdiction.hasEmploymentLaws !== false ? '✓ Yes' : '✗ No'}
              </span>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-zinc-200">
            <p className="text-xs text-zinc-600 mb-1">Data that would be sent:</p>
            <div className="bg-zinc-50 rounded p-2 font-mono text-xs">
              <div>jurisdiction: "{selectedJurisdiction.displayName || selectedJurisdiction.name}"</div>
              <div>jurisdictionCode: "{selectedJurisdiction.code}"</div>
              {selectedJurisdiction.level === 'city' && (
                <div>stateCode: "{selectedJurisdiction.stateCode}"</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
