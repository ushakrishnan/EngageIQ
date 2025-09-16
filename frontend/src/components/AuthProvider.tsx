import React from 'react';

import { AuthContext } from './auth-context'
import type { AuthContextType } from './auth-context'
import { toast } from 'sonner'
import { useDataStore } from '@/lib/useDataStore'
import databaseService from '@/lib/database'
import { clearAllUnsynced } from '@/lib/unsynced'

import type { User } from '@/types/index'

// AuthContextType is now imported from './auth-context'


// useAuth hook moved to hooks/useAuth.ts to comply with react-refresh/only-export-components rule

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Only set currentUser from sessionStorage, never auto-login from database
  const [currentUser, setCurrentUser] = React.useState<User | null>(() => {
    try {
      const raw = sessionStorage.getItem('auth-current-user')
      if (raw) {
        const userObj = JSON.parse(raw)
        // Parse karmaHistory to correct type
        const karmaHistory = Array.isArray(userObj.karmaHistory)
          ? userObj.karmaHistory.map((k: { date?: string; delta?: number; reason?: string }) => ({
              date: typeof k.date === 'string' ? k.date : '',
              delta: typeof k.delta === 'number' ? k.delta : 0,
              reason: typeof k.reason === 'string' ? k.reason : undefined
            }))
          : [];
        // Parse experience to correct type
        const experience = Array.isArray(userObj.experience)
          ? userObj.experience.map((exp: { company?: string; position?: string; duration?: string }) => ({
              company: typeof exp?.company === 'string' ? exp.company : '',
              position: typeof exp?.position === 'string' ? exp.position : '',
              duration: typeof exp?.duration === 'string' ? exp.duration : '',
            }))
          : []
        const user: User = {
          ...userObj,
          karmaHistory,
          experience,
        };
        toast.info(`AuthProvider: Restored user from sessionStorage: ${user.name}`)
        console.log('AuthProvider: Restored user from sessionStorage:', user)
        return user
      } else {
        toast.info('AuthProvider: No user found in sessionStorage')
        console.log('AuthProvider: No user found in sessionStorage')
        return null
      }
    } catch (e) {
      try { databaseService.logError('AuthProvider.sessionInit', e, {}) } catch (err) { console.error('[AuthProvider] failed to log error', err) }
      return null
    }
  })

  const [users, setUsers] = useDataStore<User>('auth-users', 'user')

  // Persist currentUser to sessionStorage when it changes
  React.useEffect(() => {
    try {
      if (currentUser) sessionStorage.setItem('auth-current-user', JSON.stringify(currentUser))
      else sessionStorage.removeItem('auth-current-user')
    } catch (e) {
      // log storage write errors for diagnostics (best-effort)
      try { databaseService.logError('AuthProvider.persistSession', e, { userId: currentUser?.id }) } catch (err) { console.error('[AuthProvider] failed to log error', err) }
      // ignore storage errors
    }
  }, [currentUser])

  // Ensure currentUser has all required fields with defaults
  const normalizedUser = currentUser ? {
    ...currentUser,
    email: currentUser.email || 'user@example.com',
    joinedAt: currentUser.joinedAt || Date.now(),
    following: currentUser.following || [],
    followers: currentUser.followers || [],
    roles: currentUser.roles || [],
    karma: currentUser.karma || 0,
    karmaHistory: Array.isArray(currentUser.karmaHistory)
      ? (currentUser.karmaHistory as { date: string; delta: number; reason?: string }[])
      : [],
    achievements: currentUser.achievements || [],
    status: currentUser.status || 'online',
    title: currentUser.title || undefined,
  company: currentUser.company || undefined,
    location: currentUser.location || undefined,
    experience: Array.isArray(currentUser.experience)
      ? currentUser.experience.map((e) => {
    const entry = e as { company?: string; position?: string; duration?: string };
          return {
            company: typeof entry.company === 'string' ? entry.company : '',
            position: typeof entry.position === 'string' ? entry.position : '',
            duration: typeof entry.duration === 'string' ? entry.duration : ''
          };
        }) as { company: string; position: string; duration: string }[]
      : [],
    skills: currentUser.skills || []
  } as User : null

  const login = async (email: string, _password: string): Promise<boolean> => {
    void _password
    // In a real app, this would validate against a backend
    // For demo purposes, we'll check if user exists and use a simple password check
    const user = (users || []).find(u => u.email === email)
    
    if (user) {
      setCurrentUser(user)
      return true
    }
    
    return false
  }

  const register = async (name: string, email: string, _password: string): Promise<boolean> => {
    void _password
    // Check if user already exists
    const existingUser = (users || []).find(u => u.email === email)
    if (existingUser) {
      return false
    }

    // Create new user
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      avatar: '',
      bio: `Hello! I'm ${name}.`,
      joinedAt: Date.now(),
      following: [],
      followers: [],
      roles: [],
      karma: 0,
      karmaHistory: [],
      achievements: [],
      status: 'online',
      experience: [],
      skills: [],
      interestedTopics: [],
      onboardingCompleted: false
    }

    setUsers(currentUsers => [...(currentUsers || []), newUser])
    setCurrentUser(newUser)
    return true
  }

  const logout = () => {
    setCurrentUser(null)

    // Best-effort cleanup of auth tokens, cookies, and unsynced local data
    try {
      if (typeof window !== 'undefined') {
        // Clear session-storage auth key (effect already removes it, but do explicitly)
        try { sessionStorage.removeItem('auth-current-user') } catch { console.debug('[AuthProvider] sessionStorage.removeItem failed') }

        // Clear unsynced queue
        try { clearAllUnsynced() } catch (e) { console.error('[AuthProvider] failed to clear unsynced', e) }

        // Remove auth-related and all app-local keys (prefix 'engageiq:') — more aggressive cleanup
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i)
            if (!key) continue
            if (/(auth|token|session|sb)/i.test(key) || /^engageiq:/i.test(key)) {
              try { localStorage.removeItem(key) } catch { console.debug('[AuthProvider] failed to remove localStorage key', key) }
            }
          }
        } catch { console.debug('[AuthProvider] failed to iterate localStorage for cleanup') }

        // Clear cookies (best-effort) for this site/path
        try {
          document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim()
            try { document.cookie = `${name}=;expires=${new Date(0).toUTCString()};path=/;SameSite=Lax` } catch { console.debug('[AuthProvider] failed to clear cookie', name) }
          })
        } catch { console.debug('[AuthProvider] failed to clear cookies') }
      }
    } catch (e) {
      console.error('[AuthProvider] logout cleanup failed', e)
    }
  }

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    if (!normalizedUser) return;

    const updatedUser = {
      ...normalizedUser,
      ...updates,
      karmaHistory: Array.isArray(updates.karmaHistory)
        ? (updates.karmaHistory as Array<{ date: string; delta: number; reason?: string }>)
        : (normalizedUser.karmaHistory ?? []),
    };
    setCurrentUser(updatedUser);

    // Update in users list as well
    setUsers(currentUsers =>
      (currentUsers || []).map(user =>
        user.id === normalizedUser.id ? updatedUser : user
      )
    );
    return Promise.resolve();
  }

  const value: AuthContextType = {
    user: normalizedUser,
    login,
    register,
    logout,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}