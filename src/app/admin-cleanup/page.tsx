'use client'

import { useState } from 'react'
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from '@/components/ui/button'

export default function AdminCleanupPage() {
  const [result, setResult] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const cleanupMutation = useMutation(api.userSettings.cleanupOldFieldsNow)

  const runCleanup = async () => {
    setIsRunning(true)
    try {
      const res = await cleanupMutation({})
      setResult(JSON.stringify(res, null, 2))
    } catch (error: any) {
      setResult(`Error: ${error.message}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Database Cleanup</h1>
      <p className="text-sm text-zinc-600 mb-4">
        This will remove old unused fields from the appSettings table.
      </p>
      
      <Button 
        onClick={runCleanup}
        disabled={isRunning}
        className="bg-purple-600 hover:bg-purple-700"
      >
        {isRunning ? 'Cleaning...' : 'Clean Up Old Fields'}
      </Button>
      
      {result && (
        <div className="mt-4 p-4 bg-zinc-100 rounded-md">
          <pre className="text-xs">{result}</pre>
        </div>
      )}
      
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-sm">
        <h3 className="font-semibold mb-2">What this does:</h3>
        <ul className="space-y-1 text-zinc-700">
          <li>• Removes: emailNotificationsEnabled, AI analysis fields, webhook fields</li>
          <li>• Keeps: Chat settings, Research settings, timestamps</li>
          <li>• Uses: ctx.db.replace() to completely overwrite the record</li>
        </ul>
      </div>
    </div>
  )
}

