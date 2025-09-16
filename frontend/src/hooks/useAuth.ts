import { useContext } from 'react';
import { AuthContext } from '@/components/auth-context';
import type { AuthContextType } from '@/components/auth-context';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}