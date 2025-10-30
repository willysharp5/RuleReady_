import { useState } from 'react'
import { MapPin, Building2, Landmark, X } from 'lucide-react'
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { JurisdictionSelect } from '@/components/ui/jurisdiction-select'

export function JurisdictionsProperties() {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<any>(null)
  
  const jurisdictionsQuery = useQuery(api.complianceQueries.getJurisdictions)
  const jurisdictions = jurisdictionsQuery || []
  
  const federal = jurisdictions.filter((j: any) => j.level === 'federal')
  const states = jurisdictions.filter((j: any) => j.level === 'state')
  const cities = jurisdictions.filter((j: any) => j.level === 'city')
  
  const active = jurisdictions.filter((j: any) => j.isActive !== false)
  const inactive = jurisdictions.filter((j: any) => j.isActive === false)
  
  const hasLaws = jurisdictions.filter((j: any) => j.hasEmploymentLaws !== false)
  const noLaws = jurisdictions.filter((j: any) => j.hasEmploymentLaws === false)
  
  return (
    <div className="space-y-2">
      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-900 mb-3">Jurisdictions</h5>
        
        {/* Overall */}
        <div className="mb-3 pb-3 border-b border-blue-200">
          <div className="text-xs text-blue-800">
            <strong>Total:</strong> {jurisdictions.length} jurisdictions
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs text-blue-800">
          {/* Left Column */}
          <div className="space-y-2">
            {/* By Level */}
            <div>
              <div className="font-semibold mb-1.5 text-blue-900">By Level</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Federal:</span>
                  <span className="font-medium">{federal.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>States:</span>
                  <span className="font-medium">{states.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cities:</span>
                  <span className="font-medium">{cities.length}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-2">
            {/* By Status */}
            <div>
              <div className="font-semibold mb-1.5 text-blue-900">By Status</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Active:</span>
                  <span className="font-medium">{active.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Inactive:</span>
                  <span className="font-medium">{inactive.length}</span>
                </div>
              </div>
            </div>
            
            {/* By Laws */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="font-semibold mb-1.5 text-blue-900">Has Laws</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Yes:</span>
                  <span className="font-medium">{hasLaws.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>No:</span>
                  <span className="font-medium">{noLaws.length}</span>
                </div>
              </div>
            </div>
          </div>
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
