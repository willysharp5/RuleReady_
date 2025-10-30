'use client'

import { useState } from 'react'
import { Trash2, BookOpen, Search, X, ChevronLeft, ChevronRight, Calendar, Tag, MapPin, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useToast } from '@/hooks/use-toast'
import { JurisdictionSelect } from '@/components/ui/jurisdiction-select'
import { TopicSelect } from '@/components/ui/topic-select'
import { TiptapEditorModal } from '@/components/TiptapEditorModal'

export default function SavedResearchFeature() {
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<any>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  
  // Filters
  const [filterJurisdiction, setFilterJurisdiction] = useState<any>(null)
  const [filterTopic, setFilterTopic] = useState<any>(null)
  
  const pageSize = 8 // 4 rows × 2 columns
  
  // Queries
  const allSavedResearch = useQuery(api.savedResearch.getAllSavedResearch)
  const savedResearch = allSavedResearch || []
  const allTopics = useQuery(api.complianceTopics.getTopics, {}) || []
  const allTemplates = useQuery(api.complianceTemplates.getAllTemplates) || []
  
  // Mutations
  const deleteSavedResearch = useMutation(api.savedResearch.deleteSavedResearch)
  const updateSavedResearch = useMutation(api.savedResearch.updateSavedResearch)
  
  // Helper to get topic name from slug or name
  const getTopicName = (topicValue: string | undefined) => {
    if (!topicValue) return null
    const topic = allTopics.find((t: any) => t.slug === topicValue || t.name === topicValue)
    return topic ? topic.name : topicValue.replace(/_/g, ' ')
  }
  
  // Helper to get template name from templateId or title
  const getTemplateName = (templateValue: string | undefined) => {
    if (!templateValue) return null
    const template = allTemplates.find((t: any) => 
      t.templateId === templateValue || 
      t.title === templateValue ||
      t.topicSlug === templateValue
    )
    return template ? template.title : templateValue.replace(/_/g, ' ')
  }
  
  // Filter saved research
  const filtered = savedResearch.filter((item: any) => {
    // Get readable names for better search
    const topicName = getTopicName(item.topic)
    const templateName = getTemplateName(item.templateUsed)
    
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.jurisdiction && item.jurisdiction.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.topic && item.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (topicName && topicName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.templateUsed && item.templateUsed.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (templateName && templateName.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesJurisdiction = !filterJurisdiction || 
      item.jurisdiction === filterJurisdiction.displayName || 
      item.jurisdiction === filterJurisdiction.name
    const matchesTopic = !filterTopic || item.topic === filterTopic.name || item.topic === filterTopic.slug
    
    return matchesSearch && matchesJurisdiction && matchesTopic
  })
  
  // Paginate
  const totalPages = Math.ceil(filtered.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedItems = filtered.slice(startIndex, startIndex + pageSize)
  
  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }
  
  // Delete saved research
  const handleDelete = async (item: any) => {
    try {
      await deleteSavedResearch({ id: item._id })
      addToast({
        title: 'Research Deleted',
        description: `"${item.title}" has been deleted.`,
        variant: 'success',
        duration: 3000
      })
      setDeleteConfirmItem(null)
    } catch (error: any) {
      addToast({
        title: 'Cannot Delete Research',
        description: error.message,
        variant: 'error',
        duration: 5000
      })
    }
  }
  
  // Save edited content
  const handleSaveEdit = async (markdown: string) => {
    if (!editingItem) return
    
    try {
      await updateSavedResearch({
        id: editingItem._id,
        content: markdown,
      })
      addToast({
        title: 'Research Updated',
        description: 'Your changes have been saved.',
        variant: 'success',
        duration: 3000
      })
      setEditingItem(null)
    } catch (error: any) {
      addToast({
        title: 'Failed to Save',
        description: error.message,
        variant: 'error',
        duration: 5000
      })
    }
  }
  
  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  // Note: JurisdictionSelect and TopicSelect components handle their own data loading
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Saved Research
          </h2>
          <p className="text-gray-600 mt-1">
            View and manage your saved research results
          </p>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search saved research..."
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Jurisdiction Filter */}
          <div className="w-64">
            <JurisdictionSelect
              value={filterJurisdiction}
              onChange={(jurisdiction: any) => {
                setFilterJurisdiction(jurisdiction)
                setCurrentPage(1)
              }}
              placeholder="All Jurisdictions"
            />
          </div>
          
          {/* Topic Filter */}
          <div className="w-64">
            <TopicSelect
              value={filterTopic}
              onChange={(topic: any) => {
                setFilterTopic(topic)
                setCurrentPage(1)
              }}
              placeholder="All Topics"
            />
          </div>
        </div>
      </div>
      
      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filtered.length} of {savedResearch.length} saved research items
      </div>
      
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedItems.map((item: any) => (
          <div key={item._id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Metadata */}
            <div className="space-y-1.5 mb-3">
              {item.jurisdiction && (
                <div className="flex items-center gap-1.5 text-xs">
                  <MapPin className="h-3 w-3 text-blue-600" />
                  <span className="text-gray-700">{item.jurisdiction}</span>
                </div>
              )}
              {item.topic && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Tag className="h-3 w-3 text-green-600" />
                  <span className="text-gray-700">{getTopicName(item.topic)}</span>
                </div>
              )}
              {item.templateUsed && (
                <div className="text-xs text-gray-500">
                  Template: {getTemplateName(item.templateUsed)}
                </div>
              )}
              {item.sources && item.sources.length > 0 && (
                <div className="text-xs text-gray-500">
                  {item.sources.length} {item.sources.length === 1 ? 'source' : 'sources'}
                </div>
              )}
            </div>
            
            {/* Content Preview */}
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {item.content.substring(0, 150)}...
            </p>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingItem(item)}
                className="flex-1"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmItem(item)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Saved Research</h3>
          <p className="text-gray-500">
            {searchQuery || filterJurisdiction || filterTopic
              ? 'No research matches your filters'
              : 'Save research results from the Research tab to see them here'}
          </p>
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmItem} onOpenChange={() => setDeleteConfirmItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Saved Research</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirmItem?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmItem(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(deleteConfirmItem)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Modal with TipTap */}
      {editingItem && (
        <TiptapEditorModal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          initialContent={editingItem.content}
          title={
            <div className="space-y-2">
              <div className="text-lg font-semibold text-gray-900">{editingItem.title}</div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  {formatDate(editingItem.createdAt)}
                </span>
                {editingItem.jurisdiction && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    {editingItem.jurisdiction}
                  </span>
                )}
                {editingItem.topic && (
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-green-600" />
                    {getTopicName(editingItem.topic)}
                  </span>
                )}
              </div>
            </div>
          }
          onSave={handleSaveEdit}
          showSaveButton={true}
        />
      )}
    </div>
  )
}

