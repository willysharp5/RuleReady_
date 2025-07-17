'use client'

import { useState, useEffect } from 'react'
import { Layout, MainContent, Footer } from '@/components/layout/layout'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useSearchParams } from 'next/navigation'
import { useConvexAuth, useQuery, useMutation, useAction } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Loader2, User, Bell, Trash2, ArrowLeft, Mail, AlertCircle, Key, Copy, Plus, Webhook, CheckCircle } from 'lucide-react'
import { useAuthActions } from "@convex-dev/auth/react"
import Link from 'next/link'
import { FirecrawlKeyManager } from '@/components/FirecrawlKeyManager'

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  const currentUser = useQuery(api.users.getCurrentUser)
  
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'firecrawl' | 'api' | 'danger'>('profile')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  
  // API Key state
  const [showNewApiKey, setShowNewApiKey] = useState(false)
  const [newApiKeyName, setNewApiKeyName] = useState('')
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
  
  // Notification settings state
  const [notificationEmail, setNotificationEmail] = useState('')
  const [defaultWebhook, setDefaultWebhook] = useState('')
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
  const [isUpdatingWebhook, setIsUpdatingWebhook] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [webhookSuccess, setWebhookSuccess] = useState(false)
  
  // API Key queries and mutations
  // Debug authentication state
  console.log('Settings Page Auth State:', { authLoading, isAuthenticated, currentUser })
  
  const apiKeys = useQuery(api.apiKeys.getUserApiKeys)
  const createApiKey = useMutation(api.apiKeys.createApiKey)
  const deleteApiKey = useMutation(api.apiKeys.deleteApiKey)
  
  // User settings queries and mutations
  const userSettings = useQuery(api.userSettings.getUserSettings)
  const emailConfig = useQuery(api.emailManager.getEmailConfig)
  const updateDefaultWebhook = useMutation(api.userSettings.updateDefaultWebhook)
  const updateEmailConfig = useMutation(api.emailManager.updateEmailConfig)
  const resendVerificationEmail = useAction(api.emailManager.resendVerificationEmail)
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('Redirecting: Not authenticated', { authLoading, isAuthenticated })
      router.push('/')
    }
  }, [authLoading, isAuthenticated, router])
  
  // Redirect if user is not found
  useEffect(() => {
    if (!authLoading && currentUser === null) {
      console.log('Redirecting: User not found', { authLoading, currentUser })
      router.push('/')
    }
  }, [authLoading, currentUser, router])
  
  // Handle query parameter navigation
  useEffect(() => {
    const section = searchParams.get('section')
    if (section === 'firecrawl') {
      setActiveSection('firecrawl')
    } else if (section === 'notifications') {
      setActiveSection('notifications')
    }
    
    // Handle verification success
    if (searchParams.get('verified') === 'true') {
      setEmailSuccess(true)
      setTimeout(() => setEmailSuccess(false), 5000)
    }
  }, [searchParams])
  
  // Populate form fields with existing data
  useEffect(() => {
    if (userSettings?.defaultWebhookUrl) {
      setDefaultWebhook(userSettings.defaultWebhookUrl)
    }
  }, [userSettings])
  
  useEffect(() => {
    if (emailConfig?.email) {
      setNotificationEmail(emailConfig.email)
    }
  }, [emailConfig])
  
  // Show loading while auth or user data is loading
  if (authLoading || currentUser === undefined || (!authLoading && !isAuthenticated) || currentUser === null) {
    return (
      <Layout>
        <Header />
        <MainContent maxWidth="7xl" className="py-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
                <p className="text-gray-500">Loading your account details...</p>
              </div>
            </div>
          </div>
        </MainContent>
        <Footer />
      </Layout>
    )
  }
  
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return
    
    setIsDeleting(true)
    try {
      // Sign out and redirect
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Failed to delete account:', error)
    } finally {
      setIsDeleting(false)
    }
  }
  
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
  
  const handleCopyApiKey = (key: string, keyId: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKeyId(keyId)
    setTimeout(() => setCopiedKeyId(null), 2000)
  }
  
  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return
    
    try {
      await deleteApiKey({ keyId: keyId as any })
    } catch (error) {
      console.error('Failed to delete API key:', error)
    }
  }
  
  return (
    <Layout>
      <Header />
      
      <MainContent maxWidth="7xl" className="py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          
          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveSection('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'profile'
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={() => setActiveSection('notifications')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'notifications'
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  Notifications
                </button>
                <button
                  onClick={() => setActiveSection('firecrawl')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'firecrawl'
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Key className="h-4 w-4" />
                  Firecrawl API
                </button>
                <button
                  onClick={() => setActiveSection('api')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'api'
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Key className="h-4 w-4" />
                  API Keys
                </button>
                <button
                  onClick={() => setActiveSection('danger')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'danger'
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                  Danger Zone
                </button>
              </nav>
            </div>
            
            {/* Content */}
            <div className="flex-1">
              {activeSection === 'profile' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={currentUser.email || ''}
                        disabled
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">Your email cannot be changed</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="name">Display Name</Label>
                      <Input
                        id="name"
                        type="text"
                        value={currentUser.name || currentUser.email || ''}
                        disabled
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Account Created</h3>
                      <p className="text-sm text-gray-600">
                        {currentUser._creationTime 
                          ? new Date(currentUser._creationTime).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'Unknown'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {activeSection === 'notifications' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-6">Notification Settings</h2>
                  
                  <div className="space-y-8">
                    {/* Default Webhook Configuration */}
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Webhook className="h-5 w-5" />
                        Default Webhook URL
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="default-webhook">Default Webhook URL (Optional)</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              id="default-webhook"
                              type="url"
                              placeholder="https://your-webhook.com/endpoint"
                              value={defaultWebhook}
                              onChange={(e) => setDefaultWebhook(e.target.value)}
                              className="flex-1"
                            />
                            <Button 
                              variant="orange" 
                              size="sm"
                              disabled={isUpdatingWebhook || defaultWebhook === (userSettings?.defaultWebhookUrl || '')}
                              onClick={async () => {
                                setIsUpdatingWebhook(true)
                                try {
                                  await updateDefaultWebhook({ 
                                    webhookUrl: defaultWebhook || undefined 
                                  })
                                  setWebhookSuccess(true)
                                  setTimeout(() => setWebhookSuccess(false), 3000)
                                } catch (error) {
                                  console.error('Failed to update webhook:', error)
                                } finally {
                                  setIsUpdatingWebhook(false)
                                }
                              }}
                            >
                              {isUpdatingWebhook ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : webhookSuccess ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            This webhook will be used as default for new monitors if not specified
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Email Configuration */}
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email Notifications
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="notification-email">Notification Email</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              id="notification-email"
                              type="email"
                              placeholder="alerts@example.com"
                              value={notificationEmail}
                              onChange={(e) => setNotificationEmail(e.target.value)}
                              className="flex-1"
                            />
                            <Button 
                              variant="orange" 
                              size="sm"
                              disabled={isUpdatingEmail || !notificationEmail || notificationEmail === emailConfig?.email}
                              onClick={async () => {
                                setIsUpdatingEmail(true)
                                try {
                                  await updateEmailConfig({ email: notificationEmail })
                                  setEmailSuccess(true)
                                  setTimeout(() => setEmailSuccess(false), 3000)
                                } catch (error) {
                                  console.error('Failed to update email:', error)
                                } finally {
                                  setIsUpdatingEmail(false)
                                }
                              }}
                            >
                              {isUpdatingEmail ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : emailSuccess ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            We&apos;ll send change notifications to this email address
                          </p>
                        </div>
                        
                        {/* Email verification status */}
                        {emailConfig && (
                          <div className={`flex items-center justify-between p-3 rounded-lg ${
                            emailConfig.isVerified 
                              ? 'bg-green-50 border border-green-200' 
                              : 'bg-amber-50 border border-amber-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              {emailConfig.isVerified ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <p className="text-sm text-green-700">
                                    Email verified and ready to receive notifications
                                  </p>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-4 w-4 text-amber-600" />
                                  <p className="text-sm text-amber-700">
                                    Please verify your email address to receive notifications
                                  </p>
                                </>
                              )}
                            </div>
                            {!emailConfig.isVerified && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await resendVerificationEmail()
                                    alert('Verification email sent!')
                                  } catch (error) {
                                    console.error('Failed to resend email:', error)
                                    alert('Failed to resend verification email')
                                  }
                                }}
                              >
                                Resend
                              </Button>
                            )}
                          </div>
                        )}
                        
                        {/* Email template preview */}
                        <div>
                          <h4 className="font-medium mb-2">Email Preview</h4>
                          <div className="border rounded-lg p-4 bg-gray-50">
                            <div className="space-y-2 text-sm">
                              <p className="font-semibold">Subject: Changes detected on example.com</p>
                              <div className="border-t pt-2">
                                <p className="text-gray-600">Hi there,</p>
                                <p className="text-gray-600 mt-2">
                                  We&apos;ve detected changes on the website you&apos;re monitoring:
                                </p>
                                <div className="mt-2 p-3 bg-white rounded border">
                                  <p className="font-medium">example.com</p>
                                  <p className="text-gray-500 text-xs mt-1">Changed at: {new Date().toLocaleString()}</p>
                                </div>
                                <p className="text-gray-600 mt-2">
                                  <a href="#" className="text-orange-600 underline">View changes →</a>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Global email preferences */}
                    <div className="border-t pt-6">
                      <h4 className="font-medium mb-3">Email Preferences</h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input type="checkbox" className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                          <span className="text-sm">Send digest emails (daily summary of all changes)</span>
                        </label>
                        <label className="flex items-center gap-3">
                          <input type="checkbox" className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" defaultChecked />
                          <span className="text-sm">Send instant notifications for each change</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeSection === 'firecrawl' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-6">Firecrawl API Key</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="text-gray-600 mb-4">
                        Connect your Firecrawl API key to enable website monitoring. Firecrawl powers the web scraping and change detection functionality.
                      </p>
                      
                      <a 
                        href="https://www.firecrawl.dev/app/api-keys" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                      >
                        Get your Firecrawl API key →
                      </a>
                    </div>
                    
                    <FirecrawlKeyManager />
                  </div>
                </div>
              )}
              
              {activeSection === 'api' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-6">API Keys</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="text-gray-600 mb-4">
                        API keys allow you to programmatically add websites to your monitoring list. 
                        Keep your API keys secure and do not share them publicly.
                      </p>
                      
                      <Link href="/api-docs" className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                        View API Documentation →
                      </Link>
                    </div>
                    
                    {/* Created API key alert */}
                    {createdApiKey && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">API Key Created Successfully</h4>
                        <p className="text-sm text-green-700 mb-3">
                          Make sure to copy your API key now. You won&apos;t be able to see it again!
                        </p>
                        <div className="flex gap-2">
                          <code className="flex-1 p-2 bg-white border rounded text-xs font-mono">
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
                    
                    {/* API Keys list */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">Your API Keys</h3>
                        <Button
                          variant="orange"
                          size="sm"
                          onClick={() => setShowNewApiKey(true)}
                          disabled={apiKeys && apiKeys.length >= 5}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Create New Key
                        </Button>
                      </div>
                      
                      {showNewApiKey && (
                        <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                          <div className="flex gap-2">
                            <Input
                              placeholder="API key name (e.g., Production)"
                              value={newApiKeyName}
                              onChange={(e) => setNewApiKeyName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleCreateApiKey()}
                              className="flex-1"
                            />
                            <Button
                              variant="orange"
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
                      
                      {apiKeys && apiKeys.length > 0 ? (
                        <div className="space-y-2">
                          {apiKeys.map((key) => (
                            <div
                              key={key._id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-sm">{key.name}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <code className="text-xs text-gray-500 font-mono">
                                    {key.keyPreview}
                                  </code>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopyApiKey(key.keyPreview, key._id)}
                                    className="h-6 px-2"
                                  >
                                    {copiedKeyId === key._id ? (
                                      <span className="text-green-600 text-xs">Copied!</span>
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Created {new Date(key.createdAt).toLocaleDateString()}
                                  {key.lastUsed && (
                                    <> • Last used {new Date(key.lastUsed).toLocaleDateString()}</>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteApiKey(key._id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Key className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">No API keys yet</p>
                          <p className="text-xs mt-1">Create your first API key to get started</p>
                        </div>
                      )}
                      
                      {apiKeys && apiKeys.length >= 5 && (
                        <p className="text-xs text-gray-500 mt-2">
                          Maximum of 5 API keys allowed per account
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {activeSection === 'danger' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-6 text-red-600">Danger Zone</h2>
                  
                  <div className="space-y-6">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h3 className="font-medium text-red-900 mb-2">Delete Account</h3>
                      <p className="text-sm text-red-700 mb-4">
                        Once you delete your account, there is no going back. All your monitored websites and data will be permanently deleted.
                      </p>
                      
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="delete-confirm" className="text-sm text-red-700">
                            Type DELETE to confirm
                          </Label>
                          <Input
                            id="delete-confirm"
                            type="text"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder="Type DELETE"
                            className="mt-1"
                          />
                        </div>
                        
                        <Button
                          variant="destructive"
                          onClick={handleDeleteAccount}
                          disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                          className="w-full"
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            'Delete Account Permanently'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </MainContent>
      
      <Footer />
    </Layout>
  )
}