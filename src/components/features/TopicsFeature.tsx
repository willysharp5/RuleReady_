'use client'

import { useState } from 'react'
import { Layers, Search, ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Eye, EyeOff, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useToast } from '@/hooks/use-toast'

const categoryColors: { [key: string]: string } = {
  'Wages & Hours': 'bg-blue-500',
  'Leave & Benefits': 'bg-green-500',
  'Safety & Training': 'bg-red-500',
  'Employment Practices': 'bg-purple-500',
  'Emerging Issues': 'bg-orange-500',
  'Regulatory Compliance': 'bg-indigo-500',
}

export default function TopicsFeature() {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState<any>(null)
  const [deleteConfirmTopic, setDeleteConfirmTopic] = useState<any>(null)
  
  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterActive, setFilterActive] = useState<string>('')
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
  })
  
  const pageSize = 8 // 4 rows × 2 columns
  const { addToast } = useToast()
  
  // Load topics and categories from database
  const topicsQuery = useQuery(api.complianceTopics.getTopics, { includeInactive: true })
  const topics = topicsQuery || []
  
  const categoriesQuery = useQuery(api.complianceTopics.getCategories)
  const categories = categoriesQuery || []
  
  // Mutations
  const createTopic = useMutation(api.complianceTopics.createTopic)
  const updateTopic = useMutation(api.complianceTopics.updateTopic)
  const deleteTopic = useMutation(api.complianceTopics.deleteTopic)
  const toggleActive = useMutation(api.complianceTopics.toggleTopicActive)

  // Filter by search and filters
  const filtered = topics.filter((t: any) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = !filterCategory || t.category === filterCategory
    const matchesActive = !filterActive || String(t.isActive !== false) === filterActive
    
    return matchesSearch && matchesCategory && matchesActive
  })
  
  // Paginate
  const totalPages = Math.ceil(filtered.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedTopics = filtered.slice(startIndex, startIndex + pageSize)
  
  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  // Form state for isActive
  const [formIsActive, setFormIsActive] = useState(true)
  
  // Open dialog for creating new topic
  const handleCreate = () => {
    setEditingTopic(null)
    setFormData({ name: '', category: '', description: '' })
    setFormIsActive(true)
    setIsDialogOpen(true)
  }

  // Open dialog for editing existing topic
  const handleEdit = (topic: any) => {
    setEditingTopic(topic)
    setFormData({
      name: topic.name,
      category: topic.category,
      description: topic.description,
    })
    setFormIsActive(topic.isActive !== false)
    setIsDialogOpen(true)
  }

  // Save topic (create or update)
  const handleSave = async () => {
    try {
      if (!formData.name || !formData.category || !formData.description) {
        addToast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "error",
        })
        return
      }

      if (editingTopic) {
        // Update existing
        await updateTopic({
          id: editingTopic._id,
          name: formData.name,
          category: formData.category,
          description: formData.description,
          isActive: formIsActive,
        })
        addToast({
          title: "Topic Updated",
          description: `"${formData.name}" has been updated successfully.`,
          variant: "success",
        })
      } else {
        // Create new
        await createTopic({
          name: formData.name,
          category: formData.category,
          description: formData.description,
        })
        addToast({
          title: "Topic Created",
          description: `"${formData.name}" has been created successfully.`,
          variant: "success",
        })
      }

      setIsDialogOpen(false)
      setFormData({ name: '', category: '', description: '' })
      setFormIsActive(true)
      setEditingTopic(null)
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error.message || "Failed to save topic.",
        variant: "error",
      })
    }
  }

  // Delete topic
  const handleDelete = async (topic: any) => {
    try {
      await deleteTopic({ id: topic._id })
      addToast({
        title: "Topic Deleted",
        description: `"${topic.name}" has been deleted.`,
        variant: "success",
      })
      setDeleteConfirmTopic(null)
    } catch (error: any) {
      addToast({
        title: "Cannot Delete Topic",
        description: error.message,
        variant: "error",
      })
    }
  }

  // Toggle active status
  const handleToggleActive = async (topic: any) => {
    try {
      const result = await toggleActive({ id: topic._id })
      addToast({
        title: result.newStatus ? "Topic Activated" : "Topic Deactivated",
        description: `"${topic.name}" is now ${result.newStatus ? 'active' : 'inactive'}.`,
        variant: "success",
      })
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error.message || "Failed to toggle topic status.",
        variant: "error",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Compliance Topics</h2>
          <p className="text-sm text-zinc-500 mt-1">Manage compliance topics for filtering and chat</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Topic
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by topic name, category, or description..."
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
            {filtered.length} of {topics.length} topics
          </div>
        </div>
        
        {/* Filter Row */}
        <div className="flex items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value)
              setCurrentPage(1)
            }}
            className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
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
          
          {(filterCategory || filterActive) && (
            <button
              onClick={() => {
                setFilterCategory('')
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

      {/* Topics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {paginatedTopics.map((topic: any) => (
          <div
            key={topic._id}
            className={`border border-zinc-200 rounded-lg p-4 bg-white hover:border-purple-300 hover:shadow-sm transition-all ${
              topic.isActive === false ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full ${categoryColors[topic.category] || 'bg-gray-500'} flex items-center justify-center flex-shrink-0`}>
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-900">{topic.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{topic.category}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                    topic.isActive === false 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {topic.isActive === false ? 'Inactive' : 'Active'}
                  </span>
                </div>
                {topic.description && (
                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{topic.description}</p>
                )}
                
                {/* Action Buttons */}
                <div className="flex items-center gap-1 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(topic)}
                    className="h-7 px-2 text-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(topic)}
                    className="h-7 px-2 text-xs flex items-center gap-1"
                  >
                    {topic.isActive === false ? (
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
                    onClick={() => setDeleteConfirmTopic(topic)}
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
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium mb-1">No topics found</p>
          <p className="text-sm">Try a different search term or create a new topic</p>
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
      
      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTopic ? 'Edit Topic' : 'Create New Topic'}</DialogTitle>
            <DialogDescription>
              {editingTopic 
                ? 'Update the compliance topic details below.' 
                : 'Add a new compliance topic for filtering and chat.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Topic Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Minimum Wage"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Select or type a category"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-zinc-500">
                Select existing category or type a new one below
              </p>
              <Input
                id="customCategory"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Or type custom category name..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this compliance topic..."
                rows={4}
              />
              <p className="text-xs text-zinc-500">
                This description helps AI understand the topic context
              </p>
            </div>
            
            {editingTopic && (
              <div className="border-t pt-4">
                <Label className="mb-3 block">Status</Label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Active</div>
                    <div className="text-xs text-gray-500">Show in dropdowns and research filters</div>
                  </div>
                </label>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingTopic ? 'Update Topic' : 'Create Topic'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmTopic} onOpenChange={() => setDeleteConfirmTopic(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Topic</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmTopic?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmTopic(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmTopic && handleDelete(deleteConfirmTopic)}
            >
              Delete Topic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
