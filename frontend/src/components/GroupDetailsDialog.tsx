import { useState, useEffect } from 'react'
import { Crown, Shield, User as UserIcon, UserMinus, Gear } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useDataStore } from '@/lib/useDataStore'
import type { Group, User, GroupMember } from '@/types'
import { toast } from 'sonner'

interface GroupDetailsDialogProps {
  group: Group | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateGroup: (group: Group) => void
  onDeleteGroup: (groupId: string) => void
}

export function GroupDetailsDialog({ 
  group, 
  open, 
  onOpenChange, 
  onUpdateGroup, 
  onDeleteGroup 
}: GroupDetailsDialogProps) {
  const [users] = useDataStore<User>('engageiq-users', 'user')
  
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (group) {
      setEditName(group.name)
      setEditDescription(group.description)
    }
  }, [group])

  if (!group) return null

  const currentMember = group.members[0]
  const isOwner = currentMember?.role === 'owner'
  const isAdmin = currentMember?.role === 'admin' || isOwner
  const canManageMembers = isAdmin

  const getUserById = (userId: string) => {
    return (users || []).find(u => u.id === userId) || {
      id: userId,
  name: 'Unknown User',
  email: '',
  avatar: '',
      bio: '',
      joinedAt: Date.now()
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <UserIcon className="h-4 w-4 text-muted-foreground" />
    }
  }

  const handleRoleChange = (memberId: string, newRole: 'admin' | 'member') => {
    if (!canManageMembers) return

    const updatedMembers = group.members.map(member =>
      member.userId === memberId 
        ? { ...member, role: newRole }
        : member
    )

    const updatedGroup = { ...group, members: updatedMembers }
    onUpdateGroup(updatedGroup)
    
    const user = getUserById(memberId)
    toast.success(`${user.name} role updated to ${newRole}`)
  }

  const handleRemoveMember = (memberId: string) => {
  if (!canManageMembers) return

    const updatedMembers = group.members.filter(member => member.userId !== memberId)
    const updatedGroup = { ...group, members: updatedMembers }
    onUpdateGroup(updatedGroup)
    
    const user = getUserById(memberId)
    toast.success(`${user.name} removed from group`)
  }

  const handleSaveGroup = () => {
    if (!isOwner) return

    const updatedGroup = {
      ...group,
      name: editName.trim(),
      description: editDescription.trim()
    }

    onUpdateGroup(updatedGroup)
    setIsEditing(false)
    toast.success('Group updated successfully')
  }

  const handleDeleteGroup = () => {
    if (!isOwner) return
    
    if (confirm(`Are you sure you want to delete "${group.name}"? This action cannot be undone.`)) {
      onDeleteGroup(group.id)
      onOpenChange(false)
      toast.success('Group deleted successfully')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={group.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {group.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-lg font-semibold"
                  />
                ) : (
                  <span>{group.name}</span>
                )}
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Gear className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {(group.members || []).length} members • {group.postCount} posts
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Description</Label>
                {isEditing ? (
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Group description"
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    {group.description || 'No description'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Privacy</Label>
                  <p className="capitalize">{group.privacy}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p>{new Date(group.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveGroup}>
                    Save Changes
                  </Button>
                </div>
              )}

              {isOwner && !isEditing && (
                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={handleDeleteGroup}
                    className="w-full"
                  >
                    Delete Group
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="space-y-3">
              {group.members.map((member: GroupMember) => {
                const memberUser = getUserById(member.userId)
                const canModify = canManageMembers && member.role !== 'owner'

                return (
                  <div key={member.userId} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={memberUser.avatar} />
                        <AvatarFallback className="bg-secondary">
                          {memberUser.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{memberUser.name}</p>
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getRoleIcon(member.role)}
                            <span className="capitalize">{member.role}</span>
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {canModify && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Gear className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role === 'member' && (
                            <DropdownMenuItem onClick={() => handleRoleChange(member.userId, 'admin')}>
                              <Shield className="mr-2 h-4 w-4" />
                              Make Admin
                            </DropdownMenuItem>
                          )}
                          {member.role === 'admin' && (
                            <DropdownMenuItem onClick={() => handleRoleChange(member.userId, 'member')}>
                              <UserIcon className="mr-2 h-4 w-4" />
                              Remove Admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleRemoveMember(member.userId)}
                            className="text-destructive"
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}