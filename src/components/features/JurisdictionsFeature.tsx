'use client'

import { useState } from 'react'
import { MapPin, Search, ChevronLeft, ChevronRight, Plus, Edit3, Trash2, X, Building2, Landmark } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useToast } from '@/hooks/use-toast'
import { DeleteConfirmationPopover } from '@/components/ui/delete-confirmation-popover'

export default function JurisdictionsFeature() {
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingJurisdiction, setEditingJurisdiction] = useState<any>(null)
  
  // Form state
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formLevel, setFormLevel] = useState<'federal' | 'state' | 'city'>('state')
  const [formParentCode, setFormParentCode] = useState('')
  const [formStateCode, setFormStateCode] = useState('')
  const [formDisplayName, setFormDisplayName] = useState('')
  
  // Load jurisdictions from database
  const jurisdictionsQuery = useQuery(api.complianceQueries.getJurisdictions)
  const jurisdictions = jurisdictionsQuery || []
  
  // Mutations
  const upsertJurisdiction = useMutation(api.complianceQueries.upsertJurisdiction)
  const deleteJurisdiction = useMutation(api.complianceQueries.deleteJurisdiction)

  // Filter by search
  const filtered = jurisdictions.filter((j: any) => 
    j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.level.toLowerCase().includes(searchQuery.toLowerCase())
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
  
  // Open create modal
  const handleCreate = () => {
    setEditingJurisdiction(null)
    setFormCode('')
    setFormName('')
    setFormLevel('state')
    setFormParentCode('US')
    setFormStateCode('')
    setFormDisplayName('')
    setShowModal(true)
  }
  
  // Open edit modal
  const handleEdit = (jurisdiction: any) => {
    setEditingJurisdiction(jurisdiction)
    setFormCode(jurisdiction.code)
    setFormName(jurisdiction.name)
    setFormLevel(jurisdiction.level || 'state')
    setFormParentCode(jurisdiction.parentCode || '')
    setFormStateCode(jurisdiction.stateCode || '')
    setFormDisplayName(jurisdiction.displayName || jurisdiction.name)
    setShowModal(true)
  }
  
  // Validate and save jurisdiction
  const handleSave = async () => {
    // Basic validation
    if (!formCode || !formName) {
      addToast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Code and Name are required',
        duration: 3000
      })
      return
    }
    
    // Validate code format based on level
    if (formLevel === 'federal') {
      if (formCode !== 'US') {
        addToast({
          variant: 'destructive',
          title: 'Invalid Code',
          description: 'Federal code must be "US"',
          duration: 3000
        })
        return
      }
    } else if (formLevel === 'state') {
      // State code must be exactly 2 uppercase letters
      if (!/^[A-Z]{2}$/.test(formCode)) {
        addToast({
          variant: 'destructive',
          title: 'Invalid State Code',
          description: 'State code must be exactly 2 uppercase letters (e.g., CA, NY, WV)',
          duration: 3000
        })
        return
      }
    } else if (formLevel === 'city') {
      // City code must be STATE-CITY format (e.g., CA-SF)
      if (!/^[A-Z]{2}-[A-Z]+$/.test(formCode)) {
        addToast({
          variant: 'destructive',
          title: 'Invalid City Code',
          description: 'City code must be STATE-CITY format (e.g., CA-SF, NY-NYC)',
          duration: 3000
        })
        return
      }
      
      // State code is required for cities
      if (!formStateCode || !/^[A-Z]{2}$/.test(formStateCode)) {
        addToast({
          variant: 'destructive',
          title: 'Invalid State Code',
          description: 'Cities must have a valid 2-letter state code (e.g., CA)',
          duration: 3000
        })
        return
      }
      
      // Parent code required for cities
      if (!formParentCode) {
        addToast({
          variant: 'destructive',
          title: 'Missing Parent Code',
          description: 'Cities must have a parent code (state code)',
          duration: 3000
        })
        return
      }
      
      // Display name required for cities
      if (!formDisplayName) {
        addToast({
          variant: 'destructive',
          title: 'Missing Display Name',
          description: 'Cities should have a display name (e.g., "San Francisco, CA")',
          duration: 3000
        })
        return
      }
    }
    
    // Check for duplicate codes
    if (!editingJurisdiction) {
      const exists = jurisdictions.find((j: any) => j.code === formCode)
      if (exists) {
        addToast({
          variant: 'destructive',
          title: 'Duplicate Code',
          description: `A jurisdiction with code "${formCode}" already exists`,
          duration: 3000
        })
        return
      }
    }
    
    try {
      // Auto-calculate parentCode based on level
      let parentCode: string | undefined;
      
      if (formLevel === 'state') {
        parentCode = 'US';
      } else if (formLevel === 'city') {
        parentCode = formStateCode; // Parent is the state
      }
      // Federal has no parent
      
      await upsertJurisdiction({
        id: editingJurisdiction?._id,
        code: formCode,
        name: formName,
        level: formLevel,
        parentCode: parentCode,
        stateCode: formStateCode || undefined,
        displayName: formDisplayName || formName,
        isActive: true,
        hasEmploymentLaws: true,
      })
      
      addToast({
        variant: 'success',
        title: editingJurisdiction ? 'Jurisdiction Updated' : 'Jurisdiction Created',
        description: `${formName} has been ${editingJurisdiction ? 'updated' : 'created'} successfully`,
        duration: 3000
      })
      
      setShowModal(false)
    } catch (error) {
      addToast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save jurisdiction',
        duration: 5000
      })
    }
  }
  
  // Delete handler
  const handleDelete = async (id: any) => {
    try {
      await deleteJurisdiction({ id })
      addToast({
        variant: 'success',
        title: 'Jurisdiction Deleted',
        description: 'Jurisdiction has been deleted successfully',
        duration: 3000
      })
    } catch (error) {
      addToast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete jurisdiction',
        duration: 5000
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Jurisdictions</h2>
          <p className="text-sm text-zinc-500 mt-1">Manage US jurisdictions and compliance rules</p>
        </div>
        <Button onClick={handleCreate} className="bg-purple-500 hover:bg-purple-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Jurisdiction
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search jurisdictions..."
            className="pl-10 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
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
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-zinc-900">{jurisdiction.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5 uppercase">{jurisdiction.code}</p>
                <span className={`
                  inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full
                    ${jurisdiction.level === 'federal' 
                      ? 'bg-blue-100 text-blue-700' 
                      : jurisdiction.level === 'state'
                    ? 'bg-green-100 text-green-700' 
                      : 'bg-orange-100 text-orange-700'
                  }
                `}>
                    {jurisdiction.level}
                </span>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(jurisdiction)}
                className="flex-1 text-xs"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Edit
              </Button>
              
              {jurisdiction.level !== 'federal' && (
                <DeleteConfirmationPopover
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  }
                  title="Delete Jurisdiction"
                  description="This will permanently delete this jurisdiction."
                  itemName={jurisdiction.name}
                  onConfirm={() => handleDelete(jurisdiction._id)}
                />
              )}
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
      
      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold">
                {editingJurisdiction ? 'Edit Jurisdiction' : 'Create Jurisdiction'}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Code *</Label>
                  <Input
                    value={formCode}
                    onChange={(e) => {
                      // Auto-uppercase
                      const upperValue = e.target.value.toUpperCase()
                      setFormCode(upperValue)
                      
                      // Auto-fill state code for cities
                      if (formLevel === 'city' && upperValue.includes('-')) {
                        const stateCode = upperValue.split('-')[0]
                        if (stateCode.length === 2) {
                          setFormStateCode(stateCode)
                          setFormParentCode(stateCode)
                        }
                      }
                    }}
                    placeholder={formLevel === 'city' ? 'CA-SF' : formLevel === 'state' ? 'CA' : 'US'}
                    className={
                      formCode && (
                        (formLevel === 'federal' && formCode !== 'US') ||
                        (formLevel === 'state' && !/^[A-Z]{2}$/.test(formCode)) ||
                        (formLevel === 'city' && !/^[A-Z]{2}-[A-Z]+$/.test(formCode))
                      ) ? 'border-red-500' : ''
                    }
                  />
                  <p className={`text-xs mt-1 ${
                    formCode && (
                      (formLevel === 'federal' && formCode !== 'US') ||
                      (formLevel === 'state' && !/^[A-Z]{2}$/.test(formCode)) ||
                      (formLevel === 'city' && !/^[A-Z]{2}-[A-Z]+$/.test(formCode))
                    ) ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {formLevel === 'state' && 'State: 2 letters (CA, NY, WV)'}
                    {formLevel === 'city' && 'City: STATE-CITY (CA-SF, NY-NYC)'}
                    {formLevel === 'federal' && 'Federal: Must be "US"'}
                  </p>
                </div>
                
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value)
                      
                      // Auto-generate display name for cities
                      if (formLevel === 'city' && formStateCode) {
                        setFormDisplayName(`${e.target.value}, ${formStateCode}`)
                      }
                    }}
                    placeholder={formLevel === 'city' ? 'San Francisco' : 'California'}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label>Level *</Label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormLevel('federal')
                      setFormCode('US')
                      setFormParentCode('')
                      setFormStateCode('')
                      setFormDisplayName('Federal')
                    }}
                    className={`p-3 border rounded-lg transition-all ${
                      formLevel === 'federal'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Landmark className="h-5 w-5 mx-auto mb-1" />
                    <div className="text-xs font-medium">Federal</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormLevel('state')
                      setFormParentCode('US')
                      setFormStateCode('')
                      setFormDisplayName(formName)
                    }}
                    className={`p-3 border rounded-lg transition-all ${
                      formLevel === 'state'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <MapPin className="h-5 w-5 mx-auto mb-1" />
                    <div className="text-xs font-medium">State</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormLevel('city')
                      setFormDisplayName('')
                    }}
                    className={`p-3 border rounded-lg transition-all ${
                      formLevel === 'city'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Building2 className="h-5 w-5 mx-auto mb-1" />
                    <div className="text-xs font-medium">City</div>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Select jurisdiction level: Federal (US), State (CA, NY), or City (CA-SF)
                </p>
              </div>
              
              {formLevel === 'city' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-3">
                    <strong>City-Specific Fields</strong>
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>State Code *</Label>
                      <Input
                        value={formStateCode}
                        onChange={(e) => {
                          const upper = e.target.value.toUpperCase()
                          setFormStateCode(upper)
                          // Auto-generate display name when state code changes
                          if (formName && upper.length === 2) {
                            setFormDisplayName(`${formName}, ${upper}`)
                          }
                        }}
                        placeholder="CA"
                        maxLength={2}
                        className={formStateCode && !/^[A-Z]{2}$/.test(formStateCode) ? 'border-red-500' : ''}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        2-letter state code (auto-fills from code)
                      </p>
                    </div>
                    
                    <div>
                      <Label>Display Name *</Label>
                      <Input
                        value={formDisplayName}
                        onChange={(e) => setFormDisplayName(e.target.value)}
                        placeholder="San Francisco, CA"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Auto-generated from name + state
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 p-6 border-t">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-purple-500 hover:bg-purple-600"
              >
                {editingJurisdiction ? 'Update' : 'Create'} Jurisdiction
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
