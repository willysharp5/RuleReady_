'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Key, Copy, Trash2, Plus } from 'lucide-react'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { DeleteConfirmationPopover } from '@/components/ui/delete-confirmation-popover'

export function ApiKeyManager() {
  const [showNewApiKey, setShowNewApiKey] = useState(false)
  const [newApiKeyName, setNewApiKeyName] = useState('')
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null)
  
  const apiKeys = useQuery(api.apiKeys.getUserApiKeys) || []
  const createApiKey = useMutation(api.apiKeys.createApiKey)
  const deleteApiKey = useMutation(api.apiKeys.deleteApiKey)
  
  const handleCreateApiKey = async () => {
    if (!newApiKeyName.trim()) return
    
    try {
      const result = await createApiKey({ name: newApiKeyName })
      setCreatedApiKey(result.key)
      setNewApiKeyName('')
      setShowNewApiKey(false)
    } catch (error) {
      console.error('Failed to create API key:', error)
    }
  }
  
  
  const handleDeleteApiKey = async (keyId: string) => {
    try {
      await deleteApiKey({ keyId: keyId as Id<"apiKeys"> })
    } catch (error) {
      console.error('Failed to delete API key:', error)
      throw error
    }
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Your API Keys</h2>
      
      {createdApiKey && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
          <h4 className="font-medium text-green-900 mb-2">API Key Created!</h4>
          <p className="text-sm text-green-700 mb-3">Copy it now - you won&apos;t see it again!</p>
          <div className="flex gap-2">
            <code className="flex-1 p-2 bg-white border rounded text-xs font-mono break-all">
              {createdApiKey}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(createdApiKey)
                setCreatedApiKey(null)
              }}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">Use API keys to add websites programmatically</p>
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowNewApiKey(true)}
          disabled={apiKeys.length >= 5}
        >
          <Plus className="h-4 w-4 mr-1" />
          Create Key
        </Button>
      </div>
      
      {showNewApiKey && (
        <div className="mb-4 p-4 border rounded-lg bg-gray-50">
          <div className="flex gap-2">
            <Input
              placeholder="Key name (e.g., Production)"
              value={newApiKeyName}
              onChange={(e) => setNewApiKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateApiKey()}
              className="flex-1"
            />
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateApiKey}
              disabled={!newApiKeyName.trim()}
            >
              Create
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowNewApiKey(false)
                setNewApiKeyName('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      {apiKeys.length > 0 ? (
        <div className="space-y-2">
          {apiKeys.map((key) => (
            <div key={key._id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-sm">{key.name}</div>
                <code className="text-xs text-gray-500 font-mono">{key.keyPreview}</code>
              </div>
              <DeleteConfirmationPopover
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
                title="Delete API Key"
                description="This will permanently delete this API key. Any applications using this key will stop working."
                itemName={key.name}
                onConfirm={() => handleDeleteApiKey(key._id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Key className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No API keys yet</p>
        </div>
      )}
    </div>
  )
}