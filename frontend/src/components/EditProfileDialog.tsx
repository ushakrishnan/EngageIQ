import React from 'react';
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Camera, Upload, X, Plus, User, Briefcase, Hash } from '@phosphor-icons/react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Popular topics for user interests
const AVAILABLE_TOPICS = [
  'Technology', 'Programming', 'AI & Machine Learning', 'Web Development', 'Mobile Development',
  'Data Science', 'Cybersecurity', 'Cloud Computing', 'DevOps', 'Blockchain',
  'Design', 'UI/UX', 'Graphic Design', 'Product Design', 'Art & Illustration',
  'Marketing', 'Business', 'Entrepreneurship', 'Finance', 'Leadership',
  'Health & Fitness', 'Mental Health', 'Cooking', 'Travel', 'Photography',
  'Music', 'Gaming', 'Sports', 'Books', 'Movies & TV',
  'Science', 'Environment', 'Education', 'Career', 'Productivity'
]

export const EditProfileDialog: React.FC<EditProfileDialogProps> = ({ open, onOpenChange }) => {
  const { user, updateProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
    title: user?.title || '',
    company: user?.company || '',
    location: user?.location || '',
    skills: user?.skills || [],
    interestedTopics: user?.interestedTopics || []
  })
  
  const [newSkill, setNewSkill] = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB')
      return
    }

    setIsUploading(true)

    try {
      // Convert to base64 for demo purposes
      // In a real app, you'd upload to a cloud service
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64String = e.target?.result as string
        setFormData(prev => ({ ...prev, avatar: base64String }))
        setIsUploading(false)
        toast.success('Photo uploaded successfully!')
      }
      reader.onerror = () => {
        setIsUploading(false)
        toast.error('Failed to upload photo')
      }
      reader.readAsDataURL(file)
    } catch {
      setIsUploading(false)
      toast.error('Failed to upload photo')
    }
  }

  const addSkill = () => {
    const trimmedSkill = newSkill.trim()
    if (trimmedSkill && !formData.skills.includes(trimmedSkill) && formData.skills.length < 10) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, trimmedSkill] }))
      setNewSkill('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({ 
      ...prev, 
      skills: prev.skills.filter(skill => skill !== skillToRemove) 
    }))
  }

  const addTopic = (topic: string) => {
    const trimmedTopic = topic.trim()
    if (trimmedTopic && !formData.interestedTopics.includes(trimmedTopic) && formData.interestedTopics.length < 10) {
      setFormData(prev => ({ ...prev, interestedTopics: [...prev.interestedTopics, trimmedTopic] }))
    }
  }

  const removeTopic = (topicToRemove: string) => {
    setFormData(prev => ({ 
      ...prev, 
      interestedTopics: prev.interestedTopics.filter(topic => topic !== topicToRemove) 
    }))
  }

  const addCustomTopic = () => {
    if (customTopic.trim()) {
      addTopic(customTopic)
      setCustomTopic('')
    }
  }

  const handleSkillKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSkill()
    }
  }

  const handleTopicKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustomTopic()
    }
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    updateProfile({
      name: formData.name.trim(),
      bio: formData.bio.trim(),
      avatar: formData.avatar,
      title: formData.title.trim(),
      company: formData.company.trim(),
      location: formData.location.trim(),
      skills: formData.skills,
      interestedTopics: formData.interestedTopics
    })
    
    toast.success('Profile updated successfully!')
    onOpenChange(false)
  }

  const handleCancel = () => {
    // Reset form data to current user data
    setFormData({
      name: user?.name || '',
      bio: user?.bio || '',
      avatar: user?.avatar || '',
      title: user?.title || '',
      company: user?.company || '',
      location: user?.location || '',
      skills: user?.skills || [],
      interestedTopics: user?.interestedTopics || []
    })
    setNewSkill('')
    setCustomTopic('')
    onOpenChange(false)
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="professional" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Professional
            </TabsTrigger>
            <TabsTrigger value="interests" className="gap-2">
              <Hash className="h-4 w-4" />
              Interests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-6 mt-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={formData.avatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {formData.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? 'Uploading...' : 'Change Photo'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Upload profile photo"
                title="Upload profile photo"
              />
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your name"
                  maxLength={50}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  className="min-h-[80px] resize-none"
                  maxLength={200}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {formData.bio.length}/200
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="City, Country"
                  maxLength={50}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="professional" className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Software Engineer, Designer, etc."
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Your current company"
                maxLength={50}
              />
            </div>

            <div className="space-y-3">
              <Label>Skills (Max 10)</Label>
              
              {/* Selected Skills */}
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1">
                      {skill}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive/20"
                        onClick={() => removeSkill(skill)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Add Skill Input */}
              {formData.skills.length < 10 && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={handleSkillKeyPress}
                    maxLength={30}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={addSkill}
                    disabled={!newSkill.trim()}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="interests" className="space-y-4 mt-6">
            <div className="space-y-3">
              <div>
                <Label>Interested Topics (Max 10)</Label>
                <p className="text-sm text-muted-foreground">
                  Select topics you're interested in to get personalized content recommendations.
                </p>
              </div>
              
              {/* Selected Topics */}
              {formData.interestedTopics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.interestedTopics.map((topic) => (
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

              {/* Available Topics */}
              {formData.interestedTopics.length < 10 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Popular topics:</p>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                    {AVAILABLE_TOPICS
                      .filter(topic => !formData.interestedTopics.includes(topic))
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
              {formData.interestedTopics.length < 10 && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom topic..."
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    onKeyPress={handleTopicKeyPress}
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
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.name.trim() || isUploading}
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}