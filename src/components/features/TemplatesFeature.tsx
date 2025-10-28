'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Template {
  id: string
  topic: string
  content: string
  lastUpdated: string
}

export default function TemplatesFeature() {
  const [templates] = useState<Template[]>([
    { id: '1', topic: 'Minimum Wage', content: 'Template content...', lastUpdated: '2 days ago' },
    { id: '2', topic: 'Paid Leave', content: 'Template content...', lastUpdated: '5 days ago' },
    { id: '3', topic: 'Overtime', content: 'Template content...', lastUpdated: '1 week ago' },
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Templates</h2>
          <p className="text-sm text-zinc-500 mt-1">Manage compliance report templates</p>
        </div>
        <Button className="bg-purple-500 hover:bg-purple-600 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates List */}
      <div className="space-y-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="border border-zinc-200 rounded-lg p-4 bg-white hover:border-purple-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-zinc-900">{template.topic}</h3>
                <p className="text-sm text-zinc-500 mt-1">Last updated: {template.lastUpdated}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

