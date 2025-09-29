import React from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import type { User } from '@/types'

interface ConversationStub {
  id: string
  participants: User[]
  lastMessage: string
  unread: number
}

interface MessagingCenterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversations?: ConversationStub[]
  onOpenConversation?: (id: string) => void
}

export const MessagingCenter: React.FC<MessagingCenterProps> = ({ open, onOpenChange, conversations = [], onOpenConversation }) => {
  // small, compact dropdown-style messages panel (single-column)
  // Render the panel as a fixed bottom-right popover so it stays above other UI (high z-index)
  // debug hook: log open state changes when requested
  React.useEffect(() => {
    try {
      const showDebug = typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('debug_messages') === '1'
      if (showDebug) console.debug('[MessagingCenter] open state changed', { open })
    } catch { /* ignore */ }
  }, [open])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Override DialogContent default centering (top/left/translate) so this dialog acts as a fixed bottom-right popover */}
      <DialogContent className="fixed bottom-4 right-4 top-auto left-auto translate-x-0 translate-y-0 z-60 w-80 max-h-[70vh] overflow-y-auto p-0">
        {/* Accessible header for dialog (visually hidden to preserve popover styling) */}
        <div className="sr-only">
          <h2>Messages panel</h2>
        </div>
        <div className="border-b px-4 py-3 bg-card">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Messages</div>
            <div className="text-xs text-muted-foreground">{conversations.length} recent</div>
          </div>
        </div>

        <div className="divide-y max-h-[60vh] overflow-y-auto bg-card">
          {conversations.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No conversations yet</div>
          )}

          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => {
                try { const showDebug = typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('debug_messages') === '1'; if (showDebug) console.debug('[MessagingCenter] conversation clicked', conv.id) } catch { /* ignore */ }
                onOpenConversation?.(conv.id); onOpenChange(false)
              }}
              className="w-full text-left flex items-start gap-3 p-3 hover:bg-accent transition-colors"
            >
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={conv.participants[0]?.avatar} />
                <AvatarFallback>{conv.participants[0]?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium truncate">{conv.participants.map(p => p.name).join(', ')}</div>
                  <div className="text-xs text-muted-foreground">{/* placeholder timestamp */}</div>
                </div>
                <div className="text-xs text-muted-foreground truncate mt-1">{conv.lastMessage}</div>
              </div>
              {conv.unread > 0 && (
                <div className="ml-2 flex items-center">
                  <div className="text-xs bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">{conv.unread}</div>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="border-t px-3 py-2 bg-card flex items-center justify-between">
          <a
            href="/messages"
            onClick={(e) => { e.preventDefault(); try { window.location.hash = '#messages'; } catch { void 0; } }}
            className="text-sm text-primary"
          >
            View all messages
          </a>
          <button className="text-sm text-muted-foreground" onClick={() => onOpenChange(false)}>Close</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MessagingCenter
