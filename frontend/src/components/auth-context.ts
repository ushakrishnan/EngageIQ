import { createContext } from 'react';

export interface AuthContextType {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    bio: string;
    joinedAt: number;
    following: string[];
    followers: string[];
    title?: string;
    company?: string;
    location?: string;
    experience?: Array<{
      company: string;
      position: string;
      duration: string;
    }>;
    skills?: string[];
    karma: number;
  karmaHistory: unknown[];
    achievements: string[];
    status: 'online' | 'away' | 'busy' | 'offline';
    statusMessage?: string;
    interestedTopics?: string[];
    onboardingCompleted?: boolean;
    roles?: string[];
  } | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<{ [key: string]: unknown }>) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);