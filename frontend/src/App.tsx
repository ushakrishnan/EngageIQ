import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { MainLayout } from '@/components/MainLayout';
import { AuthScreen } from '@/components/AuthScreen';
import { EditProfileDialog } from '@/components/EditProfileDialog';
import { GroupDetailsDialog } from '@/components/GroupDetailsDialog';
import { GroupPage } from '@/components/GroupPage';
import { SearchDialog } from '@/components/SearchDialog';
import { UserProfilePage } from '@/components/UserProfilePage';
import { useKarmaSystem } from '@/hooks/useKarmaSystem';
import { TopicInterestsSetup } from '@/components/TopicInterestsSetup';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { WelcomeMessage } from '@/components/WelcomeMessage';
import { SettingsPage } from '@/components/SettingsPage';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
const AdminRolePanel = React.lazy(() => import('@/components/AdminRolePanel').then(mod => ({ default: mod.default || mod.AdminRolePanel })));
const UnsyncedDebugPanel = React.lazy(() => import('@/components/UnsyncedDebugPanel'));
const LogViewerPanel = React.lazy(() => import('@/components/LogViewerPanel'));
import type { MentionableUser } from '@/lib/mentions';
import { extractMentionedUserIds } from '@/lib/mentions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { addUnsyncedItem, clearAllUnsynced, retryAllUnsynced } from '@/lib/unsynced';
import { useDataStore } from '@/lib/useDataStore';
import { isDevelopment } from '@/lib/config';
import databaseService from '@/lib/database';
import type { Post, Comment, Group, User } from '@/types';

function MainApp() {
  const { user: rawUser, logout, updateProfile: rawUpdateProfile } = useAuth();
  const [posts, setPosts] = useDataStore<Post>('engageiq-posts', 'post');
  const [groups, setGroups] = useDataStore<Group>('engageiq-groups', 'group');
  const [users, setUsers] = useDataStore<User>('engageiq-users', 'user');
  // Remove reports and dailyProgressAll if not used
  // const [reports, setReports] = useDataStore<any>('moderation-reports', 'report');
  // const [dailyProgressAll, setDailyProgressAll] = useDataStore<DailyProgress>('daily-progress', 'daily-progress');

  // State management
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedGroupForPost, setSelectedGroupForPost] = useState<string>('timeline');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [feedFilter, setFeedFilter] = useState<'all' | 'following' | 'professional' | 'trending' | 'hot' | 'topics'>('all');
  const [sortBy, setSortBy] = useState<'new' | 'hot' | 'top'>('new');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);
  const [viewingGroupPage, setViewingGroupPage] = useState<Group | null>(null);
  const [viewingUserProfile, setViewingUserProfile] = useState<User | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string[]>([]);
  const [showTopicSetup, setShowTopicSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [isUserModerator, setIsUserModerator] = useState(false);

  // Backend readiness check — show warning if DB is not configured/reachable
  const [dbReady, setDbReady] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const res = await fetch('/ready');
        const json = await res.json();
        if (mounted && json && json.ok) { setDbReady(true); return; }
      } catch {
        // ignore and try the more forgiving API probe below
      }
      try {
        const res2 = await fetch('/api/items/daily-progress');
        if (!mounted) return;
        if (res2.ok) {
          const arr = await res2.json();
          if (Array.isArray(arr)) { setDbReady(true); return; }
        }
      } catch {
        // still not reachable
      }
      if (mounted) setDbReady(false);
    }
    check();
    const id = setInterval(check, 30_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // Only show database setup banner to administrators (power/super/admin roles)
  const isAdminUser = useMemo(() => {
    if (!rawUser) return false;
    const maybeRoles = (rawUser as unknown as { roles?: unknown }).roles;
    if (!Array.isArray(maybeRoles)) return false;
    const roles = maybeRoles as Array<unknown>;
    return roles.some(r => /^(engageiq_admin|super_admin|power_admin)$/i.test(String(r)));
  }, [rawUser]);

  // Karma system
  const karmaSystem = useKarmaSystem();
  const { awardKarma, getUserRank } = karmaSystem;

  // Normalize currentUser fields for type safety
  const currentUser: User | null = useMemo(() => {
    if (!rawUser) return null;
    return {
      ...rawUser,
      karmaHistory: Array.isArray(rawUser.karmaHistory)
        ? (rawUser.karmaHistory as Array<{ date?: string; delta?: number; reason?: string }>).
            map((k) => ({
              date: typeof k.date === 'string' ? k.date : '',
              delta: typeof k.delta === 'number' ? k.delta : 0,
              reason: typeof k.reason === 'string' ? k.reason : undefined
            }))
        : [],
      experience: Array.isArray(rawUser.experience)
        ? (rawUser.experience as Array<{ company?: string; position?: string; duration?: string }>).
            map((exp) => ({
              company: typeof exp.company === 'string' ? exp.company : '',
              position: typeof exp.position === 'string' ? exp.position : '',
              duration: typeof exp.duration === 'string' ? exp.duration : ''
            }))
        : [],
    };
  }, [rawUser]);

  // Wrap setFeedFilter to match expected prop type
  const handleSetFeedFilter = (filter: string) => setFeedFilter(filter as typeof feedFilter);

  // Wrap updateProfile to match expected prop type
  const handleUpdateProfile = useCallback(async (profile: Partial<User>) => {
    await Promise.resolve(rawUpdateProfile(profile));
  }, [rawUpdateProfile]);

  // Memoize all mentionable users
  const allMentionableUsers = useMemo<MentionableUser[]>(() => {
    const safeUsers: User[] = users || [];
    if (!currentUser?.id) {
      return safeUsers.map((u: User) => ({ id: u.id, name: u.name, avatar: u.avatar }));
    }
    return [
      ...safeUsers.map((u: User) => ({ id: u.id, name: u.name, avatar: u.avatar })),
      { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }
    ];
  }, [users, currentUser?.id, currentUser?.name, currentUser?.avatar]);

  // Post filtering and sorting logic
  const filteredAndSortedPosts = useMemo(() => {
    const safePosts = posts || [];
    let filteredPosts = safePosts;
    switch (feedFilter) {
      case 'following': {
        const followingUserIds = currentUser?.following || [];
        filteredPosts = safePosts.filter(post =>
          followingUserIds.includes(post.userId) || post.userId === (currentUser?.id || '')
        );
        break;
      }
      case 'professional':
        filteredPosts = safePosts.filter(post => post.type === 'professional');
        break;
      case 'topics': {
        const userTopics = currentUser?.interestedTopics || [];
        const topicsToFilter = selectedTopicFilter.length > 0 ? selectedTopicFilter : userTopics;
        if (topicsToFilter.length > 0) {
          filteredPosts = safePosts.filter(post => {
            const postTags = post.tags || [];
            const hasMatchingTag = postTags.some((tag: string) =>
              topicsToFilter.some((userTopic: string) =>
                userTopic.toLowerCase() === tag.toLowerCase()
              )
            );
            let hasMatchingGroupTopic = false;
            if (post.groupId) {
              const postGroup = (groups || []).find(g => g.id === post.groupId);
              if (postGroup && postGroup.topics) {
                hasMatchingGroupTopic = postGroup.topics.some((groupTopic: string) =>
                  topicsToFilter.some((userTopic: string) =>
                    userTopic.toLowerCase() === groupTopic.toLowerCase()
                  )
                );
              }
            }
            return hasMatchingTag || hasMatchingGroupTopic;
          });
        }
        break;
      }
      case 'trending': {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        filteredPosts = safePosts
          .filter(post => post.timestamp > oneDayAgo)
          .filter(post => (post.score || 0) > 0 || (post.comments || []).length > 2);
        break;
      }
      case 'hot':
        filteredPosts = safePosts.filter(post => (post.score || 0) > 1 || (post.comments || []).length > 1);
        break;
    }
    switch (sortBy) {
      case 'hot':
        return [...filteredPosts].sort((a, b) => {
          const scoreA = (a.score || 0) + (a.comments || []).length * 0.5;
          const scoreB = (b.score || 0) + (b.comments || []).length * 0.5;
          return scoreB - scoreA;
        });
      case 'top':
        return [...filteredPosts].sort((a, b) => (b.score || 0) - (a.score || 0));
      case 'new':
      default:
        return [...filteredPosts].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
  }, [posts, feedFilter, currentUser, selectedTopicFilter, groups, sortBy]);

  // Get user's groups for post selection
  const userGroups = (groups || []).filter(group =>
    (group.members || []).some((member: { userId: string }) => member.userId === (currentUser?.id || ''))
  );

  // Logout handler
  const handleLogout = () => {
    logout();
    setActiveTab('feed');
    setFeedFilter('all');
    setNewPostContent('');
    setSelectedGroupForPost('timeline');
    setIsCreatePostOpen(false);
    setIsEditProfileOpen(false);
    setIsGroupDetailsOpen(false);
    setSelectedGroup(null);
    setViewingGroupPage(null);
    setViewingUserProfile(null);
    setIsSearchOpen(false);
    setShowSettings(false);
    try {
      setPosts([]);
      setGroups([]);
      setUsers([]);
      // Remove reports and dailyProgressAll if not used
      // setReports([]);
      // setDailyProgressAll([]);
      clearAllUnsynced();
      localStorage.removeItem('engageiq:users-updated');
    } catch (e) {
      console.error('[App] logout cleanup error', e);
    }
    setTimeout(() => {
      window.location.replace('/login');
      window.location.reload();
    }, 100);
  };

  // Like handler
  const toggleLike = useCallback((postId: string) => {
    if (!currentUser?.id) return;
    let updatedPostForPersist: Post | undefined;
    setPosts(currentPosts => {
      const postsArray: Post[] = currentPosts || [];
      return postsArray.map((post: Post) => {
        if (post.id === postId) {
          const wasLikedLocal = (post.likes || []).includes(currentUser.id);
          const newLikes = wasLikedLocal
            ? (post.likes || []).filter((id: string) => id !== currentUser.id)
            : [...(post.likes || []), currentUser.id];
          // Award karma for like when newly liked
          if (!wasLikedLocal) {
            try { awardKarma(currentUser.id, 'post_liked', 'Liked a post', postId); } catch { console.error('[App] awardKarma(post_liked) failed'); }
          }
          updatedPostForPersist = { ...post, likes: newLikes };
          return updatedPostForPersist;
        }
        return post;
      });
    });

    // Persist change to backend (or queue for retry)
    (async () => {
      if (!updatedPostForPersist) return;
      const dbItems: Omit<import('@/lib/database').DatabaseItem, 'createdAt' | 'updatedAt'>[] = [
        { id: updatedPostForPersist.id, partitionKey: 'post', type: 'post', data: { ...updatedPostForPersist, id: updatedPostForPersist.id } }
      ];
      try {
        await databaseService.bulkUpsert(dbItems);
      } catch { try { addUnsyncedItem({ ...updatedPostForPersist, type: 'post' }); } catch { console.error('[toggleLike] failed to add unsynced item'); } }
    })();
  }, [currentUser, setPosts, awardKarma]);

  // Comment handler
  const addComment = useCallback((postId: string, content: string, parentId?: string) => {
    if (!content.trim() || !currentUser?.id) return;
    const mentionedUserIds = extractMentionedUserIds(content, allMentionableUsers);
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      content: content.trim(),
      timestamp: Date.now(),
      parentId,
      mentions: mentionedUserIds
    };

    // Build updatedPost deterministically so we can persist it after updating state
    const existingPost = (posts || []).find(p => p.id === postId);
    if (!existingPost) return;
    const makeUpdatedComments = (comments: Comment[] = []) => {
      if (!parentId) {
        return [...(comments || []), newComment];
      }
      // insert reply into nested comments structure
      const addReplyToComment = (items: Comment[]): Comment[] => {
        return items.map(c => {
          if (c.id === parentId) {
            return { ...c, replies: [...(c.replies || []), newComment] };
          }
          if (c.replies) {
            return { ...c, replies: addReplyToComment(c.replies) };
          }
          return c;
        });
      };
      return addReplyToComment(comments || []);
    };

    const updatedPostForPersist: Post = { ...existingPost, comments: makeUpdatedComments(existingPost.comments || []) };

    // Update local UI
    setPosts(currentPosts => {
      const postsArray: Post[] = currentPosts || [];
      return postsArray.map((post: Post) => post.id === postId ? updatedPostForPersist : post);
    });

    // Award karma for comment (differentiate reply vs top-level)
    try {
      if (!parentId) {
        awardKarma(currentUser.id, 'comment_made', 'Commented on a post', postId);
      } else {
        awardKarma(currentUser.id, 'comment_replied', 'Replied to a comment', postId);
      }
    } catch { console.error('[App] awardKarma(comment) failed') }

    // Persist updated post (or queue unsynced)
    (async () => {
      const dbItems: Omit<import('@/lib/database').DatabaseItem, 'createdAt' | 'updatedAt'>[] = [
        { id: updatedPostForPersist.id, partitionKey: 'post', type: 'post', data: { ...updatedPostForPersist, id: updatedPostForPersist.id } }
      ];
      try {
        await databaseService.bulkUpsert(dbItems);
      } catch { try { addUnsyncedItem({ ...updatedPostForPersist, type: 'post' }); } catch { console.error('[addComment] failed to add unsynced item'); } }
    })();
  }, [currentUser, posts, setPosts, allMentionableUsers, awardKarma]);

  // Upvote handler
  const onToggleUpvote = useCallback((postId: string) => {
    // Compatibility: map upvote action to like so existing UI wiring still works
    toggleLike(postId)
  }, [toggleLike])

  // Downvote handler (not tracked in daily progress)
  // Downvote logic not implemented
  const onToggleDownvote = useCallback(() => {}, []);

  // Follow/Unfollow handlers
  const followUser = useCallback(async (userId: string) => {
    if (!currentUser?.id || !userId || userId === currentUser.id) return;
  const currentFollowing: string[] = Array.isArray(currentUser.following) ? currentUser.following : [];
    if (currentFollowing.includes(userId)) {
      toast('Already following');
      return;
    }
    const newFollowingSet = new Set([...(currentFollowing || []), userId]);
    const newFollowing = Array.from(newFollowingSet);
  handleUpdateProfile({ following: newFollowing });
  let updatedTarget: User | undefined;
    setUsers(prev => (prev || []).map((u: User) => {
      if (u.id === userId) {
        const followers = Array.isArray(u.followers) ? u.followers : [];
        const followersSet = new Set([...(followers || []), currentUser.id]);
        updatedTarget = { ...u, followers: Array.from(followersSet) };
        return updatedTarget;
      }
      return u;
    }));
    const updatedCurrentUser = { ...(currentUser as User), following: newFollowing };
    const targetUser = updatedTarget || (users || []).find(u => u.id === userId);
  // Award karma locally immediately so daily goals update even if persistence fails
  try { awardKarma(currentUser.id, 'followed', 'Followed a user', userId); } catch { console.error('[App] awardKarma(followed) failed'); }
    const savingToast = toast.loading('Saving follow…');
    try {
      const dbItems: Omit<import('@/lib/database').DatabaseItem, 'createdAt' | 'updatedAt'>[] = [];
  if (updatedCurrentUser) dbItems.push({ id: updatedCurrentUser.id, partitionKey: 'user', type: 'user', data: { ...updatedCurrentUser, id: updatedCurrentUser.id } });
  if (targetUser) dbItems.push({ id: targetUser.id, partitionKey: 'user', type: 'user', data: { ...targetUser, id: targetUser.id } });
      if (dbItems.length > 0) {
        await databaseService.bulkUpsert(dbItems);
        toast.success('Follow synced', { id: savingToast });
      } else {
        toast('Saved locally — queued for background sync', { id: savingToast });
      }
    } catch {
      try {
        if (updatedCurrentUser) addUnsyncedItem({ ...updatedCurrentUser, type: 'user' });
        if (targetUser) addUnsyncedItem({ ...targetUser, type: 'user' });
      } catch {
        // ignore
      }
      toast('Saved locally — queued for background sync', { id: savingToast });
    }
  }, [currentUser, handleUpdateProfile, setUsers, users, awardKarma]);

  const unfollowUser = useCallback(async (userId: string) => {
    if (!currentUser?.id || !userId || userId === currentUser.id) return;
  const newFollowing: string[] = (currentUser.following || []).filter((id: string) => id !== userId);
  handleUpdateProfile({ following: newFollowing });
    let updatedTarget: User | undefined;
    setUsers(prev => (prev || []).map((u: User) => {
      if (u.id === userId) {
        const followers = Array.isArray(u.followers) ? u.followers : [];
        if (followers.includes(currentUser.id)) {
          updatedTarget = { ...u, followers: followers.filter((id: string) => id !== currentUser.id) };
          return updatedTarget;
        }
      }
      return u;
    }));
    const updatedCurrentUser = { ...(currentUser as User), following: newFollowing };
    const targetUser = updatedTarget || (users || []).find(u => u.id === userId);
    const savingToast = toast.loading('Saving changes…');
    try {
  const dbItems: Omit<import('@/lib/database').DatabaseItem, 'createdAt' | 'updatedAt'>[] = [];
  if (updatedCurrentUser) dbItems.push({ id: updatedCurrentUser.id, partitionKey: 'user', type: 'user' as import('@/lib/database').DatabaseItemType, data: { ...updatedCurrentUser, id: updatedCurrentUser.id } });
  if (targetUser) dbItems.push({ id: targetUser.id, partitionKey: 'user', type: 'user' as import('@/lib/database').DatabaseItemType, data: { ...targetUser, id: targetUser.id } });
      if (dbItems.length > 0) {
        await databaseService.bulkUpsert(dbItems);
        toast.success('Unfollow synced', { id: savingToast });
      } else {
        toast('Saved locally — queued for background sync', { id: savingToast });
      }
    } catch {
      try {
        if (updatedCurrentUser) addUnsyncedItem({ ...updatedCurrentUser, type: 'user' });
        if (targetUser) addUnsyncedItem({ ...targetUser, type: 'user' });
      } catch (e) {
        console.error('[unfollowUser] failed to add unsynced item', e);
      }
      toast('Saved locally — queued for background sync', { id: savingToast });
    }
  }, [currentUser, handleUpdateProfile, setUsers, users]);

  // Create post handler
  const createPost = async (explicitTags?: string[]) => {
    if (!newPostContent.trim() || !currentUser?.id) return;
  // const mentionedUserIds = extractMentionedUserIds(newPostContent, allMentionableUsers); // unused
    const hashtagRegex = /#\w+/g;
    const hashtags = newPostContent.match(hashtagRegex) || [];
    const autoTags = hashtags.map(tag => tag.substring(1));
    const tags = explicitTags && explicitTags.length > 0 ? explicitTags : (autoTags.length > 0 ? autoTags : undefined);
    let postType: 'social' | 'professional' | 'discussion' = 'social';
    if (tags && tags.some(tag => ['business', 'career', 'professional', 'work'].includes(tag.toLowerCase()))) {
      postType = 'professional';
    } else if (newPostContent.includes('?') || newPostContent.toLowerCase().includes('what do you think')) {
      postType = 'discussion';
    }
    const newPost: Post = {
      id: `post-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content: newPostContent.trim(),
      timestamp: Date.now(),
      likes: [],
      downvotes: [],
      comments: [],
      groupId: selectedGroupForPost === 'timeline' ? undefined : selectedGroupForPost || undefined,
      type: postType,
      tags: (tags && tags.length > 0) ? tags : undefined,
      score: 0
    };
    setPosts((currentPosts: Post[] = []) => [newPost, ...(currentPosts || [])]);

    // NOTE: awardKarma already updates local daily-progress; no direct widget update here to avoid double-counting.

    // Award karma for creating a post so daily goals update
    try {
      if (currentUser?.id) {
        awardKarma(currentUser.id, 'post_created', 'Created a post', newPost.id);
      }
    } catch (e) {
      console.error('[App] awardKarma(post_created) failed', e);
    }

    // Award karma to any mentioned users in the post (best-effort)
    try {
      const mentionedUserIds = extractMentionedUserIds(newPost.content || '', allMentionableUsers);
      if (Array.isArray(mentionedUserIds) && mentionedUserIds.length > 0) {
        for (const mid of mentionedUserIds) {
          if (mid && mid !== currentUser?.id) {
            try { awardKarma(mid, 'mentioned', `Mentioned in ${currentUser?.name || 'a post'}`, newPost.id); } catch (e) { console.error('[App] awardKarma(mentioned) failed for', mid, e); }
          }
        }
      }
    } catch (e) {
      console.error('[App] mention award failed', e);
    }

    // Persist the new post to the backend (or queue unsynced)
    (async () => {
      try {
        await databaseService.create({ id: newPost.id, type: 'post', data: { ...newPost, id: newPost.id } });
      } catch {
        try { addUnsyncedItem({ ...newPost, type: 'post' }); } catch (e) { console.error('[createPost] failed to add unsynced item', e); }
      }
    })();

    // clear composer and close modal if open
    setNewPostContent('');
    setIsCreatePostOpen(false);
    toast.success('Post created');
  };

  // Edit post handler (was accidentally inlined into createPost previously)
  const editPost = useCallback(async (postId: string, newContent: string, newTags?: string[]) => {
    let updatedPost: Post | undefined;
    setPosts(prev => (prev || []).map((p: Post) => {
      if (p.id === postId) {
        updatedPost = { ...p, content: newContent, tags: newTags, editedAt: Date.now() };
        return updatedPost as Post;
      }
      return p;
    }));
    if (!updatedPost) return;
    const savingToast = toast.loading('Saving post edits…');
    try {
      const dbItems: Omit<import('@/lib/database').DatabaseItem, 'createdAt' | 'updatedAt'>[] = [
        { id: updatedPost.id, partitionKey: 'post', type: 'post', data: { ...updatedPost, id: updatedPost.id } }
      ];
      await databaseService.bulkUpsert(dbItems);
      toast.success('Edit synced', { id: savingToast });
    } catch {
      try { addUnsyncedItem({ ...updatedPost, type: 'post' }); } catch { /* ignore */ }
      toast('Saved locally — queued for background sync', { id: savingToast });
    }
  }, [setPosts]);

  // Delete post handler
  const deletePost = useCallback(async (postId: string) => {
    const postToDelete = (posts || []).find((p: Post) => p.id === postId);
    if (!postToDelete) return;
    setPosts(prev => (prev || []).filter((p: Post) => p.id !== postId));
    const deletingToast = toast.loading('Deleting post…');
    try {
      await databaseService.delete(postId, 'post');
      toast.success('Post deleted', { id: deletingToast });
    } catch {
      try {
        setPosts(prev => [postToDelete, ...(prev || [])]);
      } catch { /* ignore */ }
      try { await databaseService.logError('deletePost', 'delete error', { postId }); } catch { /* ignore */ }
      toast.error('Failed to delete post. Please try again.');
    }
  }, [posts, setPosts]);

  // Onboarding complete handler
  const handleOnboardingComplete = () => {
    if (currentUser) {
  handleUpdateProfile({ onboardingCompleted: true });
      setShowOnboarding(false);
      setTimeout(() => {
        setShowWelcomeMessage(true);
      }, 500);
    }
  };

  // Topic setup effect
  useEffect(() => {
    if (currentUser && currentUser.id && feedFilter === 'topics' && (!currentUser?.interestedTopics || currentUser.interestedTopics.length === 0)) {
      setShowTopicSetup(true);
    }
  }, [feedFilter, currentUser]);

  // Moderator status effect
  useEffect(() => {
    if (currentUser && currentUser.id) {
      const karma = currentUser.karma || 0;
      const achievements = currentUser.achievements || [];
      const isModerator = karma >= 500 || currentUser.id === 'demo-user-1' || achievements.includes('moderator');
      setIsUserModerator(isModerator);
    }
  }, [currentUser]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global error capture: send unhandled errors and promise rejections to the backend logger
  useEffect(() => {
    const handleWindowError = (ev: ErrorEvent) => {
      try {
        databaseService.logError('window.error', ev.error || ev.message, { filename: ev.filename, lineno: ev.lineno, colno: ev.colno })
      } catch (e) {
        console.error('[App] handleWindowError logging failed', e)
      }
    }

    const handleUnhandledRejection = (ev: PromiseRejectionEvent) => {
      try {
        databaseService.logError('unhandledrejection', ev.reason, {})
      } catch (e) {
        console.error('[App] handleUnhandledRejection logging failed', e)
      }
    }

    window.addEventListener('error', handleWindowError as EventListener)
    window.addEventListener('unhandledrejection', handleUnhandledRejection as EventListener)
    return () => {
      window.removeEventListener('error', handleWindowError as EventListener)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection as EventListener)
    }
  }, [])

  // Background retry of unsynced items — periodically attempt to flush the unsynced queue.
  useEffect(() => {
    let mounted = true
    if (typeof window === 'undefined') return
    const id = window.setInterval(async () => {
      if (!mounted) return
      try {
        // Only attempt retries when DB is not obviously unreachable
        if (dbReady === false) return
        await retryAllUnsynced()
      } catch (e) {
        console.debug('[App] periodic retryAllUnsynced failed', e)
      }
    }, 30_000)
    return () => { mounted = false; clearInterval(id) }
  }, [dbReady])
  // When DB becomes ready, attempt an immediate flush of the unsynced queue
  useEffect(() => {
    if (dbReady !== true) return
    let mounted = true
    void (async () => {
       try {
         const result = await retryAllUnsynced()
         if (!mounted) return
         const attempted = (result && typeof result.attempted === 'number') ? result.attempted : 0
         const succeeded = Array.isArray(result.succeeded) ? result.succeeded.length : 0
         if (attempted > 0) toast.success(`${succeeded}/${attempted} unsynced items synced after DB became ready`)
       } catch (e) {
         console.debug('[App] initial retryAllUnsynced failed', e)
       }
     })()
    return () => { mounted = false }
  }, [dbReady])

  // Render logic
  if (showSettings) {
    return (
      <SettingsPage
        onBack={() => setShowSettings(false)}
        currentUser={currentUser as User}
        isUserModerator={isUserModerator}
      />
    );
  }
  if (viewingUserProfile) {
    return (
      <UserProfilePage
        user={viewingUserProfile}
        posts={posts || []}
        groups={groups || []}
        users={users || []}
        currentUser={currentUser as User}
        onBack={() => setViewingUserProfile(null)}
        onToggleLike={toggleLike}
        onAddComment={addComment}
        onJoinGroup={() => {}}
        onLeaveGroup={() => {}}
        onViewGroupPage={() => {}}
  onViewUserProfile={(user) => setViewingUserProfile(user as User)}
        onFollowUser={followUser}
        onUnfollowUser={unfollowUser}
        onDeletePost={deletePost}
      />
    );
  }
  if (viewingGroupPage) {
    return (
      <GroupPage
        group={viewingGroupPage}
        posts={posts || []}
        users={users || []}
        currentUser={currentUser as User}
        onBack={() => setViewingGroupPage(null)}
        onJoinGroup={() => {}}
        onLeaveGroup={() => {}}
        onCreatePost={() => {}}
        onToggleLike={toggleLike}
        onAddComment={addComment}
        onEditComment={() => {}}
        onDeleteComment={() => {}}
        onEditPost={() => {}}
        onDeletePost={deletePost}
        onUpdateGroup={() => {}}
        onDeleteGroup={() => {}}
        onFollowUser={followUser}
        onUnfollowUser={unfollowUser}
      />
    );
  }
  if (!currentUser) {
    return <AuthScreen />;
  }
  return (
    <div className="min-h-screen bg-background">
      {dbReady === false && isAdminUser && (
        <div className="bg-yellow-100 text-yellow-900 p-2 text-center">Database setup required — backend cannot reach the database. Please start the Cosmos emulator or configure the database (see /admin).</div>
      )}
      <Header
  currentUser={currentUser as User}
        newPostContent={newPostContent}
        setNewPostContent={setNewPostContent}
        selectedGroupForPost={selectedGroupForPost}
        setSelectedGroupForPost={setSelectedGroupForPost}
        isCreatePostOpen={isCreatePostOpen}
        setIsCreatePostOpen={setIsCreatePostOpen}
        userGroups={userGroups}
        createPost={createPost}
        setIsSearchOpen={setIsSearchOpen}
        setActiveTab={setActiveTab}
        setIsEditProfileOpen={setIsEditProfileOpen}
        setShowSettings={setShowSettings}
        handleLogout={handleLogout}
      />
      <MainLayout
        currentUser={currentUser as User}
        users={users || []}
        posts={posts || []}
        groups={groups || []}
        allMentionableUsers={allMentionableUsers}
        filteredAndSortedPosts={filteredAndSortedPosts}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        feedFilter={feedFilter}
        setFeedFilter={handleSetFeedFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        selectedTopicFilter={selectedTopicFilter}
        setSelectedTopicFilter={setSelectedTopicFilter}
        isUserModerator={isUserModerator}
        reports={[]}
        getUserRank={getUserRank}
        setIsCreatePostOpen={setIsCreatePostOpen}
        setViewingUserProfile={setViewingUserProfile}
        setIsSearchOpen={setIsSearchOpen}
        setShowTopicSetup={setShowTopicSetup}
        toggleLike={toggleLike}
        addComment={addComment}
        followUser={followUser}
        unfollowUser={unfollowUser}
        editPost={editPost}
        deletePost={deletePost}
        onToggleUpvote={onToggleUpvote}
        onToggleDownvote={onToggleDownvote}
      />
      <EditProfileDialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen} />
      <GroupDetailsDialog group={selectedGroup} open={isGroupDetailsOpen} onOpenChange={setIsGroupDetailsOpen} onUpdateGroup={() => {}} onDeleteGroup={() => {}} />
      <SearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        users={users || []}
        groups={groups || []}
        currentUser={currentUser as User}
        onJoinGroup={() => {}}
        onLeaveGroup={() => {}}
        onViewGroupPage={() => {}}
  onViewUserProfile={(user) => setViewingUserProfile(user as User)}
        onFollowUser={followUser}
        onUnfollowUser={unfollowUser}
      />
      <Dialog open={showTopicSetup} onOpenChange={setShowTopicSetup}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set Your Topic Interests</DialogTitle>
          </DialogHeader>
          <TopicInterestsSetup
            user={currentUser as User}
            updateProfile={handleUpdateProfile}
            onComplete={() => {
              setShowTopicSetup(false);
              setFeedFilter('topics');
            }}
            onSkip={() => setShowTopicSetup(false)}
            showSkip={true}
          />
        </DialogContent>
      </Dialog>
  <OnboardingFlow open={showOnboarding} onOpenChange={setShowOnboarding} onComplete={handleOnboardingComplete} user={currentUser as User} updateProfile={handleUpdateProfile} />
      {showWelcomeMessage && <WelcomeMessage onDismiss={() => setShowWelcomeMessage(false)} />}
      {(isDevelopment || (currentUser && (currentUser.roles || []).includes('engageiq_admin'))) && (
        <>
          <React.Suspense fallback={<div>Loading debug tools...</div>}>
            <UnsyncedDebugPanel />
            <LogViewerPanel />
          </React.Suspense>
          {(currentUser && (currentUser.roles || []).includes('engageiq_admin')) && (
            <React.Suspense fallback={<div>Loading admin tools...</div>}>
              <AdminRolePanel users={users || []} setUsers={setUsers} />
            </React.Suspense>
          )}
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
