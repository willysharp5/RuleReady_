'use client'

import { useState } from 'react'
import { Plus, Trash2, FileText, Search, X, ChevronLeft, ChevronRight, Eye, EyeOff, Link, File, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useToast } from '@/hooks/use-toast'
import { ComplianceTemplateEditor } from '@/components/ComplianceTemplateEditor'

export default function TemplatesFeature() {
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<any>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  
  // Filters
  const [filterTopic, setFilterTopic] = useState<string>('')
  const [filterActive, setFilterActive] = useState<string>('')
  
  const pageSize = 8 // 4 rows × 2 columns
  
  // Queries
  const allTemplates = useQuery(api.complianceTemplates.getAllTemplates)
  const templates = allTemplates || []
  
  const topicsQuery = useQuery(api.complianceTopics.getTopics)
  const topics = topicsQuery || []
  
  // Mutations
  const deleteTemplate = useMutation(api.complianceTemplates.deleteTemplate)
  const upsertTemplate = useMutation(api.complianceTemplates.upsertTemplate)
  
  // Filter templates
  const filtered = templates.filter((t: any) => {
    const matchesSearch = 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.topicSlug && t.topicSlug.toLowerCase().includes(searchQuery.toLowerCase()))
    
    // Handle "no topic" filter
    const matchesTopic = !filterTopic || 
      (filterTopic === '__none__' ? !t.topicSlug : t.topicSlug === filterTopic)
    
    const matchesActive = !filterActive || String(t.isActive) === filterActive
    
    return matchesSearch && matchesTopic && matchesActive
  })
  
  // Paginate
  const totalPages = Math.ceil(filtered.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedTemplates = filtered.slice(startIndex, startIndex + pageSize)
  
  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }
  
  // Get topic name from slug
  const getTopicName = (slug: string | undefined) => {
    if (!slug) return 'General (All Topics)'
    const topic = topics.find((t: any) => t.slug === slug)
    return topic ? topic.name : slug
  }
  
  // Open create dialog
  const handleCreate = () => {
    setEditingTemplate(null)
    setIsEditorOpen(true)
  }
  
  // Open edit dialog
  const handleEdit = (template: any) => {
    setEditingTemplate(template)
    setIsEditorOpen(true)
  }
  
  // Delete template
  const handleDelete = async (template: any) => {
    try {
      await deleteTemplate({ templateId: template.templateId })
      addToast({
        title: 'Template Deleted',
        description: `"${template.title}" has been deleted.`,
        variant: 'success',
        duration: 3000
      })
      setDeleteConfirmTemplate(null)
    } catch (error: any) {
      addToast({
        title: 'Cannot Delete Template',
        description: error.message,
        variant: 'error',
        duration: 5000
      })
    }
  }
  
  // Toggle active status
  const handleToggleActive = async (template: any) => {
    try {
      await upsertTemplate({
        templateId: template.templateId,
        title: template.title,
        description: template.description,
        markdownContent: template.markdownContent,
        topicSlug: template.topicSlug,
        isActive: !template.isActive,
      })
      
      addToast({
        title: template.isActive ? 'Template Deactivated' : 'Template Activated',
        description: `"${template.title}" is now ${template.isActive ? 'inactive' : 'active'}.`,
        variant: 'success',
        duration: 3000
      })
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.message || 'Failed to toggle template status.',
        variant: 'error',
        duration: 5000
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Compliance Templates</h2>
          <p className="text-sm text-zinc-500 mt-1">Manage templates for compliance monitoring</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Template
        </Button>
      </div>
      
      {/* Info Box - Multiple Templates Per Topic */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800">
          <strong>Multiple Templates Per Topic:</strong> You can create multiple templates for the same topic (e.g., "Basic" and "Advanced" minimum wage templates). Associate templates to topics to enable topic-specific formatting.
        </div>
      </div>

      {/* Search and Stats */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search templates by title, description, or topic..."
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {filtered.length} of {templates.length} templates
          </div>
        </div>
        
        {/* Filter Row */}
        <div className="flex items-center gap-2">
          <select
            value={filterTopic}
            onChange={(e) => {
              setFilterTopic(e.target.value)
              setCurrentPage(1)
            }}
            className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md"
          >
            <option value="">All Topics</option>
            <option value="__none__">General (No Topic)</option>
            {topics.map((topic: any) => (
              <option key={topic.slug} value={topic.slug}>
                {topic.name}
              </option>
            ))}
          </select>
          
          <select
            value={filterActive}
            onChange={(e) => {
              setFilterActive(e.target.value)
              setCurrentPage(1)
            }}
            className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          
          {(filterTopic || filterActive) && (
            <button
              onClick={() => {
                setFilterTopic('')
                setFilterActive('')
                setCurrentPage(1)
              }}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {paginatedTemplates.map((template: any) => (
          <div
            key={template._id}
            className={`border border-zinc-200 rounded-lg p-4 bg-white hover:border-purple-300 hover:shadow-sm transition-all ${
              template.isActive === false ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-900">{template.title}</h3>
                    {template.description && (
                      <p className="text-xs text-zinc-500 mt-0.5">{template.description}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                    template.isActive === false 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {template.isActive === false ? 'Inactive' : 'Active'}
                  </span>
                </div>
                
                {/* Topic Association */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {template.topicSlug ? (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                      <Link className="w-3 h-3" />
                      {getTopicName(template.topicSlug)}
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-200 flex items-center gap-1">
                      <File className="w-3 h-3" />
                      General (All Topics)
                    </span>
                  )}
                </div>
                
                {/* Template Info */}
                <div className="mt-3 text-xs text-zinc-500">
                  <div className="flex items-center justify-between">
                    <span>Updated:</span>
                    <span className="font-medium text-zinc-700">
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-1 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    className="h-7 px-2 text-xs flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(template)}
                    className="h-7 px-2 text-xs flex items-center gap-1"
                  >
                    {template.isActive === false ? (
                      <>
                        <Eye className="w-3 h-3" />
                        Activate
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" />
                        Deactivate
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirmTemplate(template)}
                    className="h-7 px-2 text-xs flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium mb-1">No templates found</p>
          <p className="text-sm">Try a different search term or filter</p>
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
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="h-8 w-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>
            
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
      
      {/* Template Editor */}
      {isEditorOpen && (
        <ComplianceTemplateEditor
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false)
            setEditingTemplate(null)
          }}
          templateId={editingTemplate?.templateId}
          initialTemplate={editingTemplate}
          topics={topics}
          onSave={async (templateData) => {
            try {
              await upsertTemplate(templateData)
              addToast({
                title: editingTemplate ? 'Template Updated' : 'Template Created',
                description: `"${templateData.title}" has been ${editingTemplate ? 'updated' : 'created'} successfully.`,
                variant: 'success',
                duration: 3000
              })
              setIsEditorOpen(false)
              setEditingTemplate(null)
            } catch (error: any) {
              addToast({
                title: 'Error',
                description: error.message || 'Failed to save template.',
                variant: 'error',
                duration: 5000
              })
            }
          }}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmTemplate} onOpenChange={() => setDeleteConfirmTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmTemplate?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmTemplate(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmTemplate && handleDelete(deleteConfirmTemplate)}
            >
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
