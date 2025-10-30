import { useState } from 'react'
import { Layers, X, Edit2, Merge, Plus, Info } from 'lucide-react'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { TopicSelect } from '@/components/ui/topic-select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

// Category color mapping
const categoryColors: { [key: string]: { bg: string; text: string; border: string } } = {
  'Wages & Hours': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  'Leave & Benefits': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  'Safety & Training': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  'Employment Practices': { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  'Emerging Issues': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  'Regulatory Compliance': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
}

export function TopicsProperties() {
  const [selectedTopic, setSelectedTopic] = useState<any>(null)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [categoryDialogMode, setCategoryDialogMode] = useState<'rename' | 'merge' | 'create'>('rename')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [mergeTargetCategory, setMergeTargetCategory] = useState('')
  const [newTopicData, setNewTopicData] = useState({ name: '', description: '' })
  const { addToast } = useToast()
  
  const topicsQuery = useQuery(api.complianceTopics.getTopics, { includeInactive: true })
  const topics = topicsQuery || []
  
  // Mutations
  const renameCategory = useMutation(api.complianceTopics.renameCategory)
  const mergeCategories = useMutation(api.complianceTopics.mergeCategories)
  const createTopic = useMutation(api.complianceTopics.createTopic)
  
  // Get unique categories and count topics per category
  const categories = [...new Set(topics.map((t: any) => t.category))]
  
  // Stats
  const active = topics.filter((t: any) => t.isActive !== false)
  const inactive = topics.filter((t: any) => t.isActive === false)
  
  const getCategoryColor = (category: string) => {
    return categoryColors[category] || { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
  }
  
  // Open rename dialog
  const handleRenameCategory = (category: string) => {
    setEditingCategory(category)
    setNewCategoryName(category)
    setCategoryDialogMode('rename')
  }
  
  // Open merge dialog
  const handleMergeCategory = (category: string) => {
    setEditingCategory(category)
    setMergeTargetCategory('')
    setCategoryDialogMode('merge')
  }
  
  // Open create category dialog
  const handleCreateCategory = () => {
    setEditingCategory(null)
    setNewCategoryName('')
    setNewTopicData({ name: '', description: '' })
    setCategoryDialogMode('create')
  }
  
  // Save category changes
  const handleSaveCategory = async () => {
    if (!editingCategory && categoryDialogMode !== 'create') return
    
    try {
      if (categoryDialogMode === 'rename') {
        if (!newCategoryName.trim()) {
          addToast({
            title: "Validation Error",
            description: "Category name cannot be empty",
            variant: "error",
          })
          return
        }
        
        const result = await renameCategory({
          oldCategoryName: editingCategory!,
          newCategoryName: newCategoryName.trim(),
        })
        
        addToast({
          title: "Category Renamed",
          description: result.message,
          variant: "success",
        })
      } else if (categoryDialogMode === 'merge') {
        if (!mergeTargetCategory) {
          addToast({
            title: "Validation Error",
            description: "Please select a target category",
            variant: "error",
          })
          return
        }
        
        const result = await mergeCategories({
          sourceCategory: editingCategory!,
          targetCategory: mergeTargetCategory,
        })
        
        addToast({
          title: "Categories Merged",
          description: result.message,
          variant: "success",
        })
      } else {
        // Create mode
        if (!newCategoryName.trim() || !newTopicData.name.trim() || !newTopicData.description.trim()) {
          addToast({
            title: "Validation Error",
            description: "Please fill in all required fields",
            variant: "error",
          })
          return
        }
        
        await createTopic({
          name: newTopicData.name.trim(),
          category: newCategoryName.trim(),
          description: newTopicData.description.trim(),
        })
        
        addToast({
          title: "Category Created",
          description: `New category "${newCategoryName.trim()}" created with topic "${newTopicData.name.trim()}"`,
          variant: "success",
        })
      }
      
      // Close dialog and reset form
      setEditingCategory(null)
      setCategoryDialogMode('rename')
      setNewCategoryName('')
      setMergeTargetCategory('')
      setNewTopicData({ name: '', description: '' })
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error.message || "Failed to update category",
        variant: "error",
      })
    }
  }
  
  return (
    <div className="space-y-2">
      {/* Info Box */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h5 className="font-medium text-purple-900 mb-3">Compliance Topics</h5>
        
        {/* Overall */}
        <div className="mb-3 pb-3 border-b border-purple-200">
          <div className="text-xs text-purple-800">
            <strong>Total:</strong> {topics.length} topics
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs text-purple-800">
          {/* Left Column */}
          <div className="space-y-2">
            {/* By Status */}
            <div>
              <div className="font-semibold mb-1.5 text-purple-900">By Status</div>
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
          </div>
          
          {/* Right Column */}
          <div className="space-y-2">
            {/* By Category */}
            <div>
              <div className="font-semibold mb-1.5 text-purple-900">Categories</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-medium">{categories.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Topic Selector */}
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">
          Test Topic Selector
        </label>
        <TopicSelect
          value={selectedTopic}
          onChange={setSelectedTopic}
          placeholder="Search or select topic..."
        />
        <p className="text-xs text-zinc-500 mt-1">
          Searchable dropdown with topics grouped by category
        </p>
      </div>
      
      {/* Selected Topic Card */}
      {selectedTopic && (
        <div className={`bg-white border rounded-lg p-4 shadow-sm ${getCategoryColor(selectedTopic.category).border}`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-2">
              <Layers className={`h-5 w-5 mt-0.5 ${getCategoryColor(selectedTopic.category).text}`} />
              <div>
                <h4 className="font-semibold text-sm text-zinc-900">
                  {selectedTopic.name}
                </h4>
                <p className="text-xs text-zinc-500 uppercase mt-0.5">
                  {selectedTopic.slug}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTopic(null)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-600">Category:</span>
              <span className={`inline-flex items-center gap-1 font-medium ${getCategoryColor(selectedTopic.category).text}`}>
                <div className={`w-2 h-2 rounded-full ${getCategoryColor(selectedTopic.category).text.replace('text-', 'bg-')}`} />
                {selectedTopic.category}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-zinc-600">Active:</span>
              <span className={`font-medium ${selectedTopic.isActive !== false ? 'text-green-600' : 'text-red-600'}`}>
                {selectedTopic.isActive !== false ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            
            {selectedTopic.description && (
              <div className="pt-2 border-t border-zinc-200">
                <span className="text-zinc-600 block mb-1">Description:</span>
                <p className="text-zinc-900 text-xs leading-relaxed">
                  {selectedTopic.description}
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-zinc-200">
            <p className="text-xs text-zinc-600 mb-1">Data that would be sent:</p>
            <div className="bg-zinc-50 rounded p-2 font-mono text-xs">
              <div>topic: "{selectedTopic.name}"</div>
              <div>topicSlug: "{selectedTopic.slug}"</div>
              <div>category: "{selectedTopic.category}"</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Category Breakdown */}
      {categories.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-zinc-700">
              Topics by Category
            </label>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreateCategory}
              className="h-6 px-2 text-xs flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              New Category
            </Button>
          </div>
          
          {/* Helper Info */}
          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 flex items-start gap-2">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Tip:</strong> Use <strong>Merge</strong> to move topics and remove empty categories. Categories disappear when they have no topics.
            </div>
          </div>
          
          <div className="space-y-1">
            {categories.sort().map((category: string) => {
              const count = topics.filter((t: any) => t.category === category).length
              const colors = getCategoryColor(category)
              return (
                <div 
                  key={category} 
                  className={`flex items-center justify-between p-2 rounded ${colors.bg} ${colors.border} border group`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                    <span className="text-xs text-zinc-700 flex-1 min-w-0">{category}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-semibold ${colors.text}`}>{count}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRenameCategory(category)}
                        className="p-1 hover:bg-white/50 rounded"
                        title="Rename category"
                      >
                        <Edit2 className="w-3 h-3 text-zinc-600" />
                      </button>
                      <button
                        onClick={() => handleMergeCategory(category)}
                        className="p-1 hover:bg-white/50 rounded"
                        title="Merge into another category"
                      >
                        <Merge className="w-3 h-3 text-zinc-600" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Category Edit Dialog */}
      <Dialog open={!!editingCategory || categoryDialogMode === 'create'} onOpenChange={() => {
        setEditingCategory(null)
        setCategoryDialogMode('rename')
      }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {categoryDialogMode === 'rename' && 'Rename Category'}
              {categoryDialogMode === 'merge' && 'Merge Categories'}
              {categoryDialogMode === 'create' && 'Create New Category'}
            </DialogTitle>
            <DialogDescription>
              {categoryDialogMode === 'rename' && `Rename "${editingCategory}" across all topics that use it.`}
              {categoryDialogMode === 'merge' && `Move all topics from "${editingCategory}" to another category.`}
              {categoryDialogMode === 'create' && 'Create a new category by adding the first topic to it.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {categoryDialogMode === 'rename' && (
              <div className="space-y-2">
                <Label htmlFor="newCategoryName">New Category Name</Label>
                <Input
                  id="newCategoryName"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter new category name"
                />
                <p className="text-xs text-zinc-500">
                  This will update {topics.filter((t: any) => t.category === editingCategory).length} topic(s)
                </p>
              </div>
            )}
            
            {categoryDialogMode === 'merge' && (
              <div className="space-y-2">
                <Label htmlFor="targetCategory">Merge Into</Label>
                <Select
                  id="targetCategory"
                  value={mergeTargetCategory}
                  onChange={(e) => setMergeTargetCategory(e.target.value)}
                >
                  <option value="">Select target category...</option>
                  {categories
                    .filter(cat => cat !== editingCategory)
                    .sort()
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat} ({topics.filter((t: any) => t.category === cat).length} topics)
                      </option>
                    ))}
                </Select>
                <p className="text-xs text-zinc-500">
                  This will move {topics.filter((t: any) => t.category === editingCategory).length} topic(s) from "{editingCategory}"
                </p>
              </div>
            )}
            
            {categoryDialogMode === 'create' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="createCategoryName">Category Name *</Label>
                  <Input
                    id="createCategoryName"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Benefits & Compensation"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="firstTopicName">First Topic Name *</Label>
                  <Input
                    id="firstTopicName"
                    value={newTopicData.name}
                    onChange={(e) => setNewTopicData({ ...newTopicData, name: e.target.value })}
                    placeholder="e.g., Health Insurance"
                  />
                  <p className="text-xs text-zinc-500">
                    A category needs at least one topic
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="firstTopicDescription">Topic Description *</Label>
                  <Textarea
                    id="firstTopicDescription"
                    value={newTopicData.description}
                    onChange={(e) => setNewTopicData({ ...newTopicData, description: e.target.value })}
                    placeholder="Brief description of this topic..."
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditingCategory(null)
              setCategoryDialogMode('rename')
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              {categoryDialogMode === 'rename' && 'Rename Category'}
              {categoryDialogMode === 'merge' && 'Merge Categories'}
              {categoryDialogMode === 'create' && 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
