import { useState } from 'react'
import { MapPin, Building2, Landmark, X } from 'lucide-react'
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { JurisdictionSelect } from '@/components/ui/jurisdiction-select'

export function JurisdictionsProperties() {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<any>(null)
  
  const jurisdictionsQuery = useQuery(api.complianceQueries.getJurisdictions)
  const jurisdictions = jurisdictionsQuery || []
  
  const states = jurisdictions.filter((j: any) => j.level === 'state')
  const cities = jurisdictions.filter((j: any) => j.level === 'city')
  
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
      
      {/* Jurisdiction Selector */}
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">
          Test Jurisdiction Selector
        </label>
        <JurisdictionSelect
          value={selectedJurisdiction}
          onChange={setSelectedJurisdiction}
          placeholder="Search or select jurisdiction..."
        />
        <p className="text-xs text-zinc-500 mt-1">
          Searchable dropdown with Federal, States, and Cities
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
