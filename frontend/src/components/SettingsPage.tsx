import { useState } from 'react'
import type { User } from '@/types'
import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Gear as Settings, 
  Database, 
  ArrowLeft,
  Shield
} from '@phosphor-icons/react'
// Lazy-load heavy admin/database components to reduce initial bundle size
const CosmosDBDashboard = React.lazy(() => import('./CosmosDBDashboard').then(mod => ({ default: mod.CosmosDBDashboard })))
const AdminRolePanel = React.lazy(() => import('./AdminRolePanel').then(mod => ({ default: mod.default || mod.AdminRolePanel })))

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription
} from '@/components/ui/alert-dialog'
import { saveAs } from 'file-saver';
import { isDevelopment } from '@/lib/config'
// Removed unused import
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// Removed unused import

interface SettingsPageProps {
  onBack: () => void
  currentUser: User
  isUserModerator: boolean
}

export function SettingsPage({ onBack, currentUser, isUserModerator }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState('database')
  const isAdmin = Array.isArray(currentUser?.roles) && currentUser.roles.includes('engageiq_admin')
  const [aiEmbeddingDeployment, setAiEmbeddingDeployment] = useState('')
  const [aiSimilarityThreshold, setAiSimilarityThreshold] = useState('')
  const [aiVocab, setAiVocab] = useState('')
  // const [aiLoading, setAiLoading] = useState(false)
  // Admin user management state
  const [users, setUsers] = useState<User[]>([])
  React.useEffect(() => {
    if (!isAdmin) return
    // Fetch all users for admin
    fetch('/api/items/user')
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch users'))
      .then((data: { data: User }[]) => {
        setUsers(Array.isArray(data) ? data.map(item => item.data) : [])
      })
      .catch(() => setUsers([]))
  }, [isAdmin])

  // Data & Privacy state and handlers
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  async function handleExportData() {
    try {
      const adminServer = (import.meta.env.VITE_ADMIN_SERVER_URL as string) || 'http://localhost:4000';
      const resp = await fetch(`${adminServer}/user/export`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser && currentUser.id || ''
        }
      });
      if (!resp.ok) {
        toast.error('Failed to export data');
        return;
      }
      const userData = await resp.json();
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      saveAs(blob, 'my-engageiq-data.json');
      toast.success('Your data has been downloaded.');
    } catch {
      toast.error('Failed to export data');
    }
  }


  async function handleDeleteAccount() {
    setDeleteStatus('Deleting account...');
    try {
      // Placeholder: Replace with real delete logic (call backend endpoint)
      setTimeout(() => {
        setDeleteStatus('Account deleted (simulated).');
        setShowDeleteDialog(false);
        // Optionally, log out the user or redirect
      }, 1500);
    } catch (err) {
      setDeleteStatus('Failed to delete account: ' + (err as Error).message);
    }
  }

  React.useEffect(() => {
    if (activeTab !== 'ai-settings' || !isAdmin) return
  let cancelled = false
  const load = async () => {
      const adminServer = (import.meta.env.VITE_ADMIN_SERVER_URL as string) || 'http://localhost:4000'
      try {
        const resp = await fetch(`${adminServer}/admin/config`, { headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser && currentUser.id || '' } })
        if (!resp.ok) return
        const j = await resp.json()
        const cfg = j?.config || {}
        if (!cancelled) {
          setAiEmbeddingDeployment(cfg.AOAI_EMBEDDING_DEPLOYMENT || cfg.AOAI_EMBEDDING_MODEL || process.env.AOAI_EMBEDDING_DEPLOYMENT || '')
          setAiSimilarityThreshold(String(cfg.AUTOTAG_SIMILARITY_THRESHOLD || process.env.AUTOTAG_SIMILARITY_THRESHOLD || '0.5'))
          setAiVocab(cfg.AUTOTAG_VOCAB || process.env.AUTOTAG_VOCAB || '')
        }
      } catch (e) {
        console.error('Failed to load AI config', e)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [activeTab, isAdmin, currentUser])

  // const saveAiSettings = async () => {
  //   if (!isAdmin) return
  //   setAiLoading(true)
  //   // const adminServer = (import.meta.env.VITE_ADMIN_SERVER_URL as string) || 'http://localhost:4000'
  //   try {
  //     // upsert each key (actual logic omitted for brevity)
  //   } finally {
  //     setAiLoading(false)
  //   }
  // }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-3 max-w-7xl">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </h1>
            {isDevelopment && (
              <Badge variant="outline" className="text-xs">
                Development Mode
              </Badge>
            )}
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex gap-6 lg:gap-8">
          {/* Sidebar Navigation and Main Content Area */}
          <aside className="w-64 flex-shrink-0">
            <div className="sticky top-20 space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Categories</h3>
              <nav className="space-y-1">
                {isAdmin && (
                  <>
                    <Button
                      variant={activeTab === 'database' ? 'default' : 'ghost'}
                      className="w-full justify-start gap-3"
                      onClick={() => setActiveTab('database')}
                    >
                      <Database className="h-4 w-4" />
                      Database
                    </Button>
                    <Button
                      variant={activeTab === 'admin-users' ? 'default' : 'ghost'}
                      className="w-full justify-start gap-3"
                      onClick={() => setActiveTab('admin-users')}
                    >
                      <Shield className="h-4 w-4" />
                      User Management
                    </Button>
                  </>
                )}
                <Button
                  variant={activeTab === 'profile' ? 'default' : 'ghost'}
                  className="w-full justify-start gap-3"
                  onClick={() => setActiveTab('profile')}
                >
                  Profile
                </Button>
                <Button
                  variant={activeTab === 'notifications' ? 'default' : 'ghost'}
                  className="w-full justify-start gap-3"
                  onClick={() => setActiveTab('notifications')}
                >
                  Notifications
                </Button>
                <Button
                  variant={activeTab === 'appearance' ? 'default' : 'ghost'}
                  className="w-full justify-start gap-3"
                  onClick={() => setActiveTab('appearance')}
                >
                  Appearance
                </Button>
                <Button
                  variant={activeTab === 'privacy' ? 'default' : 'ghost'}
                  className="w-full justify-start gap-3"
                  onClick={() => setActiveTab('privacy')}
                >
                  Privacy
                </Button>
                {isUserModerator && (
                  <Button
                    variant={activeTab === 'moderation' ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveTab('moderation')}
                  >
                    Moderation
                  </Button>
                )}
                <Button
                  variant={activeTab === 'data' ? 'default' : 'ghost'}
                  className="w-full justify-start gap-3"
                  onClick={() => setActiveTab('data')}
                >
                  Data & Privacy
                </Button>
                {isAdmin && (
                  <Button
                    variant={activeTab === 'ai-settings' ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveTab('ai-settings')}
                  >
                    <Settings className="h-4 w-4" />
                    AI Settings
                  </Button>
                )}
              </nav>
            </div>
          </aside>
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="hidden" />
              {/* Database Settings (super-admin only) */}
              {isAdmin && (
                <TabsContent value="database" className="space-y-6">
                  <React.Suspense fallback={<div>Loading database tools...</div>}>
                    <CosmosDBDashboard />
                  </React.Suspense>
                </TabsContent>
              )}
              {/* Admin User Management (super-admin only) */}
              {isAdmin && (
                <TabsContent value="admin-users" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold">User Management</h3>
                      <p className="text-sm text-muted-foreground">
                        Manage user roles, view audit logs, and set retention policies
                      </p>
                    </CardHeader>
                    <CardContent>
                      <React.Suspense fallback={<div>Loading user management...</div>}>
                        <AdminRolePanel users={users} setUsers={setUsers} />
                      </React.Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
              {/* Profile Settings */}
              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Profile Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your profile information and preferences
                    </p>
                  </CardHeader>
                  <CardContent>
                    {/* TODO: Implement full profile editing form and user data management actions */}
                    <div className="grid gap-4 max-w-lg">
                      <div>
                        <Label htmlFor="profile-name">Name</Label>
                        <Input id="profile-name" type="text" placeholder="Your name" disabled />
                      </div>
                      <div>
                        <Label htmlFor="profile-email">Email</Label>
                        <Input id="profile-email" type="email" placeholder="Your email" disabled />
                      </div>
                      <div>
                        <Label htmlFor="profile-avatar">Avatar URL</Label>
                        <Input id="profile-avatar" type="text" placeholder="Avatar URL" disabled />
                      </div>
                      <div>
                        <Label htmlFor="profile-bio">Bio</Label>
                        <Input id="profile-bio" type="text" placeholder="Short bio" disabled />
                      </div>
                      <div>
                        <Label htmlFor="profile-location">Location</Label>
                        <Input id="profile-location" type="text" placeholder="Location" disabled />
                      </div>
                      <div>
                        <Label htmlFor="profile-website">Website</Label>
                        <Input id="profile-website" type="text" placeholder="Website" disabled />
                      </div>
                      <Button disabled>Save Changes (TODO)</Button>
                    </div>
                    <Separator className="my-6" />
                    {/* Data & Privacy actions for profile */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Export My Data</h4>
                        <p className="text-sm text-muted-foreground">Download a copy of your data in JSON format</p>
                        <Button variant="outline" onClick={handleExportData} disabled>Download My Data (TODO)</Button>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium text-destructive">Delete My Account</h4>
                        <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data</p>
                        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled>Delete My Account (TODO)</Button>
                        {showDeleteDialog && (
                          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                            <AlertDialogContent>
                              <AlertDialogTitle>Delete Account</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete your account? This action cannot be undone.
                              </AlertDialogDescription>
                              <div className="flex gap-2 mt-4 justify-end">
                                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                  Cancel
                                </Button>
                                <Button variant="destructive" onClick={handleDeleteAccount} disabled>
                                  Yes, Delete (TODO)
                                </Button>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {deleteStatus && <span className="text-sm text-gray-500">{deleteStatus}</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              {/* Notifications Settings */}
              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Notification Preferences</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose what notifications you want to receive
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Notification settings will be available in a future update.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              {/* Appearance Settings */}
              <TabsContent value="appearance" className="space-y-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Appearance</h3>
                    <p className="text-sm text-muted-foreground">
                      Customize the look and feel of the application
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Theme and appearance settings will be available in a future update.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              {/* Privacy Settings */}
              <TabsContent value="privacy" className="space-y-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Privacy Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Control your privacy and data sharing preferences
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Privacy settings will be available in a future update.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              {/* Moderation Settings */}
              {isUserModerator && (
                <TabsContent value="moderation" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold">Moderation Settings</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure moderation tools and policies
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Advanced moderation settings will be available in a future update.
                        Use the moderation dashboard in the main navigation for now.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
              {/* Data & Privacy */}
              <TabsContent value="data" className="space-y-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Data Management</h3>
                    <p className="text-sm text-muted-foreground">
                      Export, import, or delete your data
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Export Data</h4>
                      <p className="text-sm text-muted-foreground">
                        Download a copy of your data in JSON format
                      </p>
                      <Button variant="outline" onClick={handleExportData}>
                        Download My Data
                      </Button>
                    </div>
                    <Separator />
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-medium text-destructive">Delete Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all associated data
                      </p>
                      <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                        Delete My Account
                      </Button>
                      {showDeleteDialog && (
                        <AlertDialog
                          open={showDeleteDialog}
                          onOpenChange={setShowDeleteDialog}
                        >
                          <AlertDialogContent>
                            <AlertDialogTitle>Delete Account</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete your account? This action cannot be undone.
                            </AlertDialogDescription>
                            <div className="flex gap-2 mt-4 justify-end">
                              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                Cancel
                              </Button>
                              <Button variant="destructive" onClick={handleDeleteAccount}>
                                Yes, Delete
                              </Button>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {deleteStatus && <span className="text-sm text-gray-500">{deleteStatus}</span>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              {/* AI Settings - Super Admins */}
              {isAdmin && (
                <TabsContent value="ai-settings" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold">AI Settings</h3>
                      <p className="text-sm text-muted-foreground">
                        Manage AI-related configurations and preferences
                      </p>
                    </CardHeader>
                    <CardContent>
                      {/* TODO: Implement full AI settings management for super admins */}
                      <div className="grid gap-4 max-w-lg">
                        <div>
                          <Label htmlFor="ai-embedding">AI Embedding Deployment</Label>
                          <Input id="ai-embedding" type="text" value={aiEmbeddingDeployment} onChange={e => setAiEmbeddingDeployment(e.target.value)} placeholder="Enter deployment name" disabled />
                        </div>
                        <div>
                          <Label htmlFor="ai-threshold">AI Similarity Threshold</Label>
                          <Input id="ai-threshold" type="text" value={aiSimilarityThreshold} onChange={e => setAiSimilarityThreshold(e.target.value)} placeholder="Enter similarity threshold" disabled />
                        </div>
                        <div>
                          <Label htmlFor="ai-vocab">AI Vocab</Label>
                          <Input id="ai-vocab" type="text" value={aiVocab} onChange={e => setAiVocab(e.target.value)} placeholder="Enter vocab URL" disabled />
                        </div>
                        {/* Add more AI settings fields here as needed */}
                        <Button disabled>Save AI Settings (TODO)</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
