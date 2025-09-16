// Moderation types (stubs, expand as needed)
export interface ModerationReport {
  id: string;
  userId: string;
  reason: string;
  status: string;
  timestamp: number;
  autoDetected?: boolean;
  contentPreview?: string;
  reporterName?: string;
  [key: string]: unknown;
}
export interface ModerationAction {
  id: string;
  reportId: string;
  action: string;
  type: string;
  actorId: string;
  timestamp: number;
  targetUserName?: string;
  moderatorName?: string;
  [key: string]: unknown;
}
export interface AutoModerationRule {
  id: string;
  description: string;
  enabled: boolean;
  [key: string]: unknown;
}
export interface UserModerationStatus {
  userId: string;
  status: string;
  updatedAt: number;
  [key: string]: unknown;
}
import type { UnsyncedPayload } from '@/types/unsynced'
// DailyProgress: tracks per-user daily engagement metrics
export interface DailyProgress extends UnsyncedPayload {
  id: string;
  date: string;
  userId: string;
  posts: number;
  comments: number;
  likes: number;
  // Additional engagement counters
  mentions?: number;
  follows?: number;
  groupsJoined?: number;
  karmaEarned: number;
  createdAt: number;
  updatedAt: number;
  [key: string]: unknown;
}

// AuditLog: tracks admin actions for role changes and moderation
export interface AuditLog {
  action: string;
  role?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  actorId?: string;
  actorName?: string;
  ts: number;
  timestamp?: number;
  details?: Record<string, unknown>;
}
export interface Post {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  timestamp: number
  likes: string[]
  downvotes: string[]
  comments: Comment[]
  groupId?: string
  editedAt?: number
  type: 'social' | 'professional' | 'discussion'
  category?: string
  tags?: string[]
  isPinned?: boolean
  score?: number
  [key: string]: unknown
}

export interface Comment {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: number
  parentId?: string
  replies?: Comment[]
  mentions?: string[] // Array of mentioned user IDs
  [key: string]: unknown;
}

export interface GroupMember {
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: number
  [key: string]: unknown;
}

export interface Group {
  id: string
  name: string
  description: string
  members: GroupMember[]
  postCount: number
  createdAt: number
  createdBy: string
  privacy: 'public' | 'private'
  avatar?: string
  // Reddit-like subreddit features
  category: 'professional' | 'social' | 'technical' | 'creative' | 'gaming' | 'news'
  rules: string[]
  moderators: string[]
  // Topic-based categorization
  topics: string[] // Main topics this group focuses on
  // Discord-like features
  channels: Array<{
    id: string
    name: string
    type: 'text' | 'voice' | 'announcement'
    description?: string
  }>
  [key: string]: unknown
}

export interface User extends UnsyncedPayload {
  id: string
  name: string
  email: string
  avatar: string
  bio: string
  joinedAt: number
  following: string[] // Array of user IDs this user is following
  followers: string[] // Array of user IDs that follow this user
  // Professional LinkedIn-like fields
  title?: string
  company?: string
  location?: string
  experience?: Array<{
    company: string;
    position: string;
    duration: string;
    [key: string]: unknown;
  }>
  skills?: string[]
  // Roles (application-level) such as 'engageiq_admin' or 'group_admin'
  roles?: string[]
  // Reddit-like karma system
  karma: number
  karmaHistory: Array<{ date: string; delta: number; reason?: string }>
  achievements: string[]
  // Discord-like status
  status: 'online' | 'away' | 'busy' | 'offline'
  statusMessage?: string
  // Topic interests for better content discovery
  interestedTopics?: string[] // Topics the user wants to see more of
  // Onboarding tracking
  onboardingCompleted?: boolean
  [key: string]: unknown;
}

// Moderation report minimal shape used by the navigation and moderation UI
export interface Report {
  id: string
  status?: 'pending' | 'resolved' | string
  [key: string]: unknown
}