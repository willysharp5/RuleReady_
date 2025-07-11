'use client'

import { useState } from 'react'
import { Layout, MainContent, Footer } from '@/components/layout/layout'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useConvexAuth, useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Loader2, User, Key, Bell, Trash2, ArrowLeft, Mail, Check, AlertCircle } from 'lucide-react'
import { useAuthActions } from "@convex-dev/auth/react"
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  const currentUser = useQuery(api.users.getCurrentUser)
  
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'danger'>('profile')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  
  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    router.push('/')
    return null
  }
  
  // Show loading while auth or user data is loading
  if (authLoading || currentUser === undefined) {
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
  
  // If user is not found, redirect to home
  if (currentUser === null) {
    router.push('/')
    return null
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
                  
                  <div className="space-y-6">
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
                              className="flex-1"
                            />
                            <Button variant="orange" size="sm">
                              Save Email
                            </Button>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            We'll send change notifications to this email address
                          </p>
                        </div>
                        
                        {/* Email verification status */}
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <p className="text-sm text-amber-700">
                            Please verify your email address to receive notifications
                          </p>
                        </div>
                        
                        {/* Email template preview */}
                        <div>
                          <h4 className="font-medium mb-2">Email Preview</h4>
                          <div className="border rounded-lg p-4 bg-gray-50">
                            <div className="space-y-2 text-sm">
                              <p className="font-semibold">Subject: Changes detected on example.com</p>
                              <div className="border-t pt-2">
                                <p className="text-gray-600">Hi there,</p>
                                <p className="text-gray-600 mt-2">
                                  We've detected changes on the website you're monitoring:
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