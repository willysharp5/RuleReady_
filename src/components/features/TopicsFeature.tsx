'use client'

import { Layers } from 'lucide-react'

interface Topic {
  id: string
  name: string
  rulesCount: number
  color: string
}

export default function TopicsFeature() {
  const topics: Topic[] = [
    { id: '1', name: 'Minimum Wage', rulesCount: 312, color: 'bg-blue-500' },
    { id: '2', name: 'Paid Leave', rulesCount: 245, color: 'bg-green-500' },
    { id: '3', name: 'Overtime', rulesCount: 198, color: 'bg-purple-500' },
    { id: '4', name: 'Discrimination', rulesCount: 156, color: 'bg-red-500' },
    { id: '5', name: 'Safety', rulesCount: 134, color: 'bg-yellow-500' },
    { id: '6', name: 'Benefits', rulesCount: 123, color: 'bg-pink-500' },
    { id: '7', name: 'Termination', rulesCount: 112, color: 'bg-indigo-500' },
    { id: '8', name: 'Hiring', rulesCount: 98, color: 'bg-orange-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Topics</h2>
        <p className="text-sm text-zinc-500 mt-1">Browse compliance rules by topic</p>
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {topics.map((topic) => (
          <div
            key={topic.id}
            className="border border-zinc-200 rounded-lg p-4 bg-white hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full ${topic.color} flex items-center justify-center flex-shrink-0`}>
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-zinc-900">{topic.name}</h3>
                <p className="text-sm text-zinc-500 mt-0.5">{topic.rulesCount} rules across all jurisdictions</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="border-t border-zinc-200 pt-4 mt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-600">Total Topics</span>
          <span className="font-semibold text-zinc-900">{topics.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-zinc-600">Total Rules</span>
          <span className="font-semibold text-zinc-900">
            {topics.reduce((sum, t) => sum + t.rulesCount, 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}

