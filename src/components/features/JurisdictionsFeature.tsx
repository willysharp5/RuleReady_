'use client'

import { useState } from 'react'
import { MapPin, Search, ChevronLeft, ChevronRight, Plus, Edit3, Trash2, X } from 'lucide-react'
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
  const [formType, setFormType] = useState<'federal' | 'state' | 'local'>('state')
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
  
  // Open create modal
  const handleCreate = () => {
    setEditingJurisdiction(null)
    setFormCode('')
    setFormName('')
    setFormType('state')
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
    setFormType(jurisdiction.type)
    setFormLevel(jurisdiction.level || jurisdiction.type)
    setFormParentCode(jurisdiction.parentCode || (jurisdiction.type === 'state' ? 'US' : ''))
    setFormStateCode(jurisdiction.stateCode || '')
    setFormDisplayName(jurisdiction.displayName || jurisdiction.name)
    setShowModal(true)
  }
  
  // Save jurisdiction
  const handleSave = async () => {
    if (!formCode || !formName) {
      addToast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Code and Name are required',
        duration: 3000
      })
      return
    }
    
    try {
      await upsertJurisdiction({
        id: editingJurisdiction?._id,
        code: formCode,
        name: formName,
        type: formType,
        level: formLevel,
        parentCode: formParentCode || undefined,
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
                    ${jurisdiction.type === 'federal' 
                      ? 'bg-blue-100 text-blue-700' 
                      : jurisdiction.type === 'state'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                    }
                  `}>
                    {jurisdiction.level || jurisdiction.type}
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
              
              {jurisdiction.type !== 'federal' && (
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
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g., CA or CA-SF"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    State: 2 letters (CA). City: STATE-CITY (CA-SF)
                  </p>
                </div>
                
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., California"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="federal">Federal</option>
                    <option value="state">State</option>
                    <option value="local">Local</option>
                  </select>
                </div>
                
                <div>
                  <Label>Level</Label>
                  <select
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="federal">Federal</option>
                    <option value="state">State</option>
                    <option value="city">City</option>
                  </select>
                </div>
              </div>
              
              {formLevel === 'city' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>State Code</Label>
                    <Input
                      value={formStateCode}
                      onChange={(e) => setFormStateCode(e.target.value)}
                      placeholder="e.g., CA"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      For cities: parent state code
                    </p>
                  </div>
                  
                  <div>
                    <Label>Display Name</Label>
                    <Input
                      value={formDisplayName}
                      onChange={(e) => setFormDisplayName(e.target.value)}
                      placeholder="e.g., San Francisco, CA"
                    />
                  </div>
                </div>
              )}
              
              <div>
                <Label>Parent Code</Label>
                <Input
                  value={formParentCode}
                  onChange={(e) => setFormParentCode(e.target.value)}
                  placeholder="e.g., US for states, CA for cities"
                />
                <p className="text-xs text-gray-500 mt-1">
                  States: "US". Cities: state code (e.g., "CA")
                </p>
              </div>
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
