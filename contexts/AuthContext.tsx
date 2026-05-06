import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  signIn as authSignIn, 
  signUp as authSignUp, 
  signOut as authSignOut, 
  fetchProfile,
  updateProfile as authUpdateProfile 
} from '../services/authService';
import type { User } from '../types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata: { name: string; avatar: string; userCode?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<User | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  // Load profile from Supabase profiles table
  const loadProfile = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const profile = await fetchProfile(userId);
      setUser(prev => {
        if (prev && profile && JSON.stringify(prev) === JSON.stringify(profile)) return prev;
        return profile;
      });
      return profile;
    } catch (err) {
      console.error('Failed to load profile:', err);
      setUser(null);
      return null;
    }
  }, []);

  // Initialize auth — runs exactly once
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // SAFETY TIMEOUT: absolute last resort
    const safetyTimeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('Auth safety timeout reached. Forcing loading=false.');
          return false;
        }
        return prev;
      });
    }, 5000);

    // PRIMARY INIT: check for existing session
    const initAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          return;
        }

        setSession(currentSession);
        
        if (currentSession?.user) {
          await loadProfile(currentSession.user.id);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        clearTimeout(safetyTimeout);
        setLoading(false);
      }
    };

    initAuth();

    // LISTENER: Handle subsequent auth events SYNCHRONOUSLY.
    // CRITICAL: Do NOT use async/await here! The Supabase SDK internally waits
    // for onAuthStateChange callbacks to complete before resolving signInWithPassword.
    // If we await loadProfile here, signInWithPassword hangs → login spinner hangs forever.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth event:', event);

        // Skip INITIAL_SESSION since initAuth already handled it
        if (event === 'INITIAL_SESSION') return;

        setSession(newSession);

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && newSession?.user) {
          // Fire-and-forget: load profile in the background, do NOT block the callback
          loadProfile(newSession.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const handleSignIn = async (email: string, password: string) => {
    // 1. Authenticate with Supabase (this resolves once auth is done)
    const { session: newSession } = await authSignIn(email, password);
    // 2. Set session immediately for downstream consumers
    setSession(newSession);
    // 3. Load the user profile (this is what actually sets `user` and triggers the redirect)
    if (newSession?.user) {
      await loadProfile(newSession.user.id);
    }
  };

  const handleSignUp = async (
    email: string,
    password: string,
    metadata: { name: string; avatar: string; userCode?: string }
  ) => {
    const { session: newSession } = await authSignUp(email, password, metadata);
    setSession(newSession);
    if (newSession?.user) {
      // Small delay to allow the DB trigger to create the profile row
      await new Promise(resolve => setTimeout(resolve, 800));
      await loadProfile(newSession.user.id);
    }
  };

  const handleSignOut = async () => {
    await authSignOut();
    setUser(null);
    setSession(null);
  };

  const handleUpdateProfile = async (updates: Partial<User>): Promise<User | null> => {
    if (!session?.user) return null;
    const updated = await authUpdateProfile(session.user.id, updates);
    if (updated) {
      setUser(updated);
    }
    return updated;
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await loadProfile(session.user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
      updateProfile: handleUpdateProfile,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
