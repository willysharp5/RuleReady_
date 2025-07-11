'use client'

import { useState } from 'react'
import { X, Globe, Mail, Webhook, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

interface WebhookConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: {
    notificationPreference: 'none' | 'email' | 'webhook' | 'both'
    webhookUrl?: string
  }) => void
  initialConfig?: {
    notificationPreference: 'none' | 'email' | 'webhook' | 'both'
    webhookUrl?: string
  }
  websiteName: string
}

export function WebhookConfigModal({ isOpen, onClose, onSave, initialConfig, websiteName }: WebhookConfigModalProps) {
  const [notificationPreference, setNotificationPreference] = useState(initialConfig?.notificationPreference || 'none')
  const [webhookUrl, setWebhookUrl] = useState(initialConfig?.webhookUrl || '')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleSave = () => {
    onSave({
      notificationPreference: notificationPreference as 'none' | 'email' | 'webhook' | 'both',
      webhookUrl: (notificationPreference === 'webhook' || notificationPreference === 'both') ? webhookUrl : undefined
    })
  }

  const copyPayloadExample = () => {
    const payload = JSON.stringify({
      event: "website_changed",
      website: {
        name: websiteName,
        url: "https://example.com",
        checkInterval: 60
      },
      change: {
        detectedAt: new Date().toISOString(),
        changeType: "content_modified",
        summary: "Page content has changed",
        diff: {
          added: ["New paragraph added", "Updated heading"],
          removed: ["Old footer text"]
        }
      },
      scrapeResult: {
        title: "Example Website",
        description: "Website description",
        markdown: "# Page Content\\n\\nThis is the scraped content..."
      }
    }, null, 2)

    navigator.clipboard.writeText(payload)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Notification Settings</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-8 h-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Notification Type Selection */}
          <div>
            <Label htmlFor="notification-type">Notification Type</Label>
            <Select
              id="notification-type"
              value={notificationPreference}
              onChange={(e) => setNotificationPreference(e.target.value)}
              className="w-full mt-1"
            >
              <option value="none">No notifications</option>
              <option value="email">Email only</option>
              <option value="webhook">Webhook only</option>
              <option value="both">Email and Webhook</option>
            </Select>
          </div>

          {/* Email Configuration Info */}
          {(notificationPreference === 'email' || notificationPreference === 'both') && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Email Notifications</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Configure your email address in the <a href="/settings" className="underline font-medium">settings page</a> to receive change notifications.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Webhook Configuration */}
          {(notificationPreference === 'webhook' || notificationPreference === 'both') && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://your-server.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  We'll send a POST request to this URL when changes are detected
                </p>
              </div>

              {/* Webhook Payload Example */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Webhook Payload Example</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyPayloadExample}
                    className="text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs">
                    <code>{`{
  "event": "website_changed",
  "website": {
    "name": "${websiteName}",
    "url": "https://example.com",
    "checkInterval": 60
  },
  "change": {
    "detectedAt": "${new Date().toISOString()}",
    "changeType": "content_modified",
    "summary": "Page content has changed",
    "diff": {
      "added": ["New paragraph added", "Updated heading"],
      "removed": ["Old footer text"]
    }
  },
  "scrapeResult": {
    "title": "Example Website",
    "description": "Website description",
    "markdown": "# Page Content\\n\\nThis is the scraped content..."
  }
}`}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="orange" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  )
}