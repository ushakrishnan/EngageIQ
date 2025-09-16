import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Flag, Shield, Warning as AlertTriangle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { User } from '@/types'

interface QuickModerationPanelProps {
  contentType: 'post' | 'comment' | 'user' | 'group'
  contentId: string
  contentOwnerId: string
  currentUser: User
  isUserModerator?: boolean
  onContentAction: (contentId: string, action: string) => void
  onUserAction: (userId: string, action: string, duration?: number) => void
  onReport: (contentType: string, contentId: string, reason: string, customReason?: string) => void
}

export function QuickModerationPanel({
  contentType,
  contentId,
  contentOwnerId,
  currentUser,
  isUserModerator = false,
  onContentAction,
  onUserAction,
  onReport
}: QuickModerationPanelProps) {
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [customReason, setCustomReason] = useState('')

  const handleReport = () => {
    if (!reportReason) return
    
    onReport(contentType, contentId, reportReason, customReason || undefined)
    setIsReportOpen(false)
    setReportReason('')
    setCustomReason('')
    toast.success('Content reported successfully')
  }

  const handleQuickAction = (action: string) => {
    if (action.includes('content')) {
      onContentAction(contentId, action)
    } else {
      onUserAction(contentOwnerId, action)
    }
  }

  return (
    <>
      {/* Quick Report Button - Available to all users */}
      {currentUser.id !== contentOwnerId && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-destructive"
          onClick={() => setIsReportOpen(true)}
        >
          <Flag className="h-4 w-4" />
          Report
        </Button>
      )}

      {/* Moderator Actions - Only for moderators */}
      {isUserModerator && (
        <div className="flex items-center gap-1 border-l pl-2 ml-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Shield className="h-3 w-3" />
            Mod
          </Badge>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-yellow-600 hover:text-yellow-700"
            onClick={() => handleQuickAction('hide_content')}
            title="Hide this content"
          >
            Hide
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
            onClick={() => handleQuickAction('delete_content')}
            title="Delete this content"
          >
            Delete
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-orange-600 hover:text-orange-700"
            onClick={() => handleQuickAction('warning')}
            title="Warn user"
          >
            Warn
          </Button>
        </div>
      )}

      {/* Report Dialog */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Report {contentType}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Help us maintain a safe community</p>
                  <p>Reports help moderators identify content that violates our community guidelines.</p>
                </div>
              </div>
            </div>
            
            <div>
              <Label>Reason for reporting *</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam or unwanted content</SelectItem>
                  <SelectItem value="harassment">Harassment or bullying</SelectItem>
                  <SelectItem value="inappropriate">Inappropriate or offensive content</SelectItem>
                  <SelectItem value="misinformation">False or misleading information</SelectItem>
                  <SelectItem value="copyright">Copyright or intellectual property violation</SelectItem>
                  <SelectItem value="violence">Violence or harmful behavior</SelectItem>
                  <SelectItem value="hate_speech">Hate speech or discrimination</SelectItem>
                  <SelectItem value="privacy">Privacy violation</SelectItem>
                  <SelectItem value="other">Other violation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {reportReason && (
              <div>
                <Label>Additional details (optional)</Label>
                <Textarea
                  placeholder="Provide more context about this report. What specific rule or guideline does this violate?"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Additional context helps moderators make better decisions.
                </p>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsReportOpen(false)
                  setReportReason('')
                  setCustomReason('')
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleReport} 
                disabled={!reportReason}
                className="gap-2"
              >
                <Flag className="h-4 w-4" />
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}