'use client'

import { useState } from 'react'
import { Plus, Edit3, Trash2, FileText, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useToast } from '@/hooks/use-toast'
import { ComplianceTemplateEditor } from '@/components/ComplianceTemplateEditor'
import { DeleteConfirmationPopover } from '@/components/ui/delete-confirmation-popover'

export default function TemplatesFeature() {
  const { addToast } = useToast()
  
  // Queries
  const allTemplates = useQuery(api.complianceTemplates.getAllTemplates)
  
  // Mutations
  const deleteTemplate = useMutation(api.complianceTemplates.deleteTemplate)
  const upsertTemplate = useMutation(api.complianceTemplates.upsertTemplate)
  
  // State
  const [templateSearchQuery, setTemplateSearchQuery] = useState('')
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<{
    topicKey: string
    topicName: string
    template?: any
  } | null>(null)

  const deleteTemplateAction = async ({ templateId }: { templateId: string }) => {
    try {
      await deleteTemplate({ templateId })
      addToast({
        variant: 'success',
        title: 'Template deleted',
        description: 'Template has been deleted successfully',
        duration: 3000
      })
    } catch (error) {
      addToast({
        variant: 'destructive',
        title: 'Error deleting template',
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 5000
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Compliance Templates
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage legal counsel templates for compliance monitoring
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTemplate({
              topicKey: 'new',
              topicName: 'New Template'
            });
            setShowTemplateEditor(true);
          }}
          className="gap-2 bg-purple-500 hover:bg-purple-600"
        >
          <Plus className="h-4 w-4" />
          Create New Template
        </Button>
      </div>
      
      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search templates by name or topic..."
              value={templateSearchQuery}
              onChange={(e) => setTemplateSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {allTemplates?.length || 0} templates
        </div>
      </div>
      
      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allTemplates
          ?.filter(template => 
            !templateSearchQuery || 
            template.title.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
            (template.topicKey && template.topicKey.toLowerCase().includes(templateSearchQuery.toLowerCase())) ||
            (template.description && template.description.toLowerCase().includes(templateSearchQuery.toLowerCase()))
          )
          ?.map((template) => (
            <div
              key={template._id}
              className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {template.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {template.description || `Topic: ${template.topicKey || 'General'}`}
                  </p>
                </div>
              </div>
              
              <div className="text-xs text-gray-600 mb-3">
                <div className="flex items-center justify-between">
                  <span>
                    {template.markdownContent.length} characters
                  </span>
                  <span>
                    Updated {new Date(template.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingTemplate({
                      topicKey: template.topicKey || '',
                      topicName: template.title,
                      template: template
                    });
                    setShowTemplateEditor(true);
                  }}
                  className="flex-1 text-xs"
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                
                {!template.isDefault && (
                  <DeleteConfirmationPopover
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    }
                    title="Delete Template"
                    description="This will permanently delete this compliance template. This action cannot be undone."
                    itemName={template.title}
                    onConfirm={async () => {
                      await deleteTemplateAction({ templateId: template.templateId });
                    }}
                  />
                )}
              </div>
            </div>
          ))}
      </div>
      
      {/* Empty State */}
      {(!allTemplates || allTemplates.length === 0) && (
        <div className="text-center py-12 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">No templates found</p>
          <p className="text-sm mb-4">Create your first compliance template to get started</p>
          <Button
            onClick={() => {
              setEditingTemplate({
                topicKey: 'new',
                topicName: 'New Template'
              });
              setShowTemplateEditor(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>
      )}
      
      {/* Filtered Empty State */}
      {allTemplates && allTemplates.length > 0 && 
       allTemplates.filter(template => 
         !templateSearchQuery || 
         template.title.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
         (template.topicKey && template.topicKey.toLowerCase().includes(templateSearchQuery.toLowerCase())) ||
         (template.description && template.description.toLowerCase().includes(templateSearchQuery.toLowerCase()))
       ).length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Search className="h-8 w-8 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No templates match your search</p>
          <p className="text-xs mt-1">Try a different search term</p>
        </div>
      )}
      
      {/* Template Editor Modal */}
      {showTemplateEditor && editingTemplate && (
        <ComplianceTemplateEditor
          isOpen={showTemplateEditor}
          onClose={() => {
            setShowTemplateEditor(false)
            setEditingTemplate(null)
          }}
          topicKey={editingTemplate.topicKey}
          topicName={editingTemplate.topicName}
          initialTemplate={editingTemplate.template}
          onSave={async (templateData) => {
            try {
              await upsertTemplate(templateData)
              addToast({
                variant: 'success',
                title: 'Template saved',
                description: 'Template has been saved successfully',
                duration: 3000
              })
              setShowTemplateEditor(false)
              setEditingTemplate(null)
            } catch (error) {
              addToast({
                variant: 'destructive',
                title: 'Error saving template',
                description: error instanceof Error ? error.message : 'Unknown error',
                duration: 5000
              })
            }
          }}
        />
      )}
    </div>
  )
}
