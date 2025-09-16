import type { User } from '../types'
import React from 'react';
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// import { useAuth } from '@/components/AuthProvider' // Not exported
import { X, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface GroupMember {
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: number
}

interface Group {
  id: string
  name: string
  description: string
  members: GroupMember[]
  postCount: number
  createdAt: number
  createdBy: string
  privacy: 'public' | 'private'
  avatar?: string
  category: 'professional' | 'social' | 'technical' | 'creative' | 'gaming' | 'news'
  rules: string[]
  moderators: string[]
  topics: string[]
  channels: Array<{
    id: string
    name: string
    type: 'text' | 'voice' | 'announcement'
    description?: string
  }>
}

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateGroup: (group: Group) => void
}

// Popular topics that users can select from
const POPULAR_TOPICS = [
  'Technology', 'Programming', 'AI & Machine Learning', 'Web Development', 'Mobile Development',
  'Data Science', 'Cybersecurity', 'Cloud Computing', 'DevOps', 'Blockchain',
  'Design', 'UI/UX', 'Graphic Design', 'Product Design', 'Art & Illustration',
  'Marketing', 'Business', 'Entrepreneurship', 'Finance', 'Leadership',
  'Health & Fitness', 'Mental Health', 'Cooking', 'Travel', 'Photography',
  'Music', 'Gaming', 'Sports', 'Books', 'Movies & TV',
  'Science', 'Environment', 'Education', 'Career', 'Productivity'
]

export function CreateGroupDialog({ open, onOpenChange, onCreateGroup, user }: CreateGroupDialogProps & { user: User }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public')
  const [category, setCategory] = useState<'professional' | 'social' | 'technical' | 'creative' | 'gaming' | 'news'>('social')
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [customTopic, setCustomTopic] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addTopic = (topic: string) => {
    const trimmedTopic = topic.trim()
    if (trimmedTopic && !selectedTopics.includes(trimmedTopic) && selectedTopics.length < 5) {
      setSelectedTopics([...selectedTopics, trimmedTopic])
    }
  }

  const removeTopic = (topicToRemove: string) => {
    setSelectedTopics(selectedTopics.filter(topic => topic !== topicToRemove))
  }

  const addCustomTopic = () => {
    if (customTopic.trim()) {
      addTopic(customTopic)
      setCustomTopic('')
    }
  }

  const handleCustomTopicKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustomTopic()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
  if (!user) return
    if (!name.trim()) {
      toast.error('Group name is required')
      return
    }

    if (selectedTopics.length === 0) {
      toast.error('Please select at least one topic for your group')
      return
    }

    setIsSubmitting(true)

    try {
      const newGroup: Group = {
        id: `group-${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        members: [{
          userId: user.id,
          role: 'owner',
          joinedAt: Date.now()
        }],
        postCount: 0,
        createdAt: Date.now(),
  createdBy: user.id,
        privacy,
        category,
        topics: selectedTopics,
        rules: [
          'Be respectful and professional',
          'Stay on topic',
          'No spam or excessive self-promotion'
        ],
  moderators: [user.id],
        channels: [
          { id: 'general', name: 'general', type: 'text', description: 'General discussions' },
          { id: 'announcements', name: 'announcements', type: 'announcement', description: 'Important updates' }
        ]
      }

      onCreateGroup(newGroup)
      
      // Reset form
      setName('')
      setDescription('')
      setPrivacy('public')
      setCategory('social')
      setSelectedTopics([])
      setCustomTopic('')
      onOpenChange(false)
      
      toast.success(`Group "${newGroup.name}" created successfully!`)
    } catch (error) {
      toast.error('Failed to create group')
      try {
        // Record error to DB (best-effort)
        await import('@/lib/database').then(mod => mod.default.logError ? mod.default.logError('CreateGroupDialog.handleSubmit', error, { name, category }) : Promise.resolve())
      } catch (err) {
        console.error('[CreateGroupDialog] failed to log error', err)
      }
     } finally {
       setIsSubmitting(false)
     }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="Enter group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="group-description">Description</Label>
            <Textarea
              id="group-description"
              placeholder="What is this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(value: typeof category) => setCategory(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="gaming">Gaming</SelectItem>
                <SelectItem value="news">News & Discussion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Topics (Select up to 5)</Label>
            
            {/* Selected Topics */}
            {selectedTopics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTopics.map((topic) => (
                  <Badge key={topic} variant="secondary" className="gap-1">
                    {topic}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive/20"
                      onClick={() => removeTopic(topic)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Popular Topics */}
            {selectedTopics.length < 5 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Popular topics:</p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {POPULAR_TOPICS
                    .filter(topic => !selectedTopics.includes(topic))
                    .map((topic) => (
                      <Badge
                        key={topic}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                        onClick={() => addTopic(topic)}
                      >
                        {topic}
                        <Plus className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Custom Topic Input */}
            {selectedTopics.length < 5 && (
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom topic..."
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  onKeyPress={handleCustomTopicKeyPress}
                  maxLength={30}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addCustomTopic}
                  disabled={!customTopic.trim()}
                >
                  Add
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Privacy</Label>
            <RadioGroup value={privacy} onValueChange={(value: 'public' | 'private') => setPrivacy(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="font-normal">
                  Public - Anyone can join
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="font-normal">
                  Private - Invite only
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || selectedTopics.length === 0 || isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}