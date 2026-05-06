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
  const loadingProfileRef = useRef(false);

  // Load profile from Supabase profiles table — guarded against concurrent calls and no-op updates
  const loadProfile = useCallback(async (userId: string): Promise<User | null> => {
    if (loadingProfileRef.current) return null;
    loadingProfileRef.current = true;
    try {
      const profile = await fetchProfile(userId);
      setUser(prev => {
        // Only update state if the profile actually changed (prevents re-render cascade)
        if (prev && profile && JSON.stringify(prev) === JSON.stringify(profile)) return prev;
        return profile;
      });
      return profile;
    } catch (err) {
      console.error('Failed to load profile:', err);
      setUser(null);
      return null;
    } finally {
      loadingProfileRef.current = false;
    }
  }, []);

  // Initialize auth — runs exactly once
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // SAFETY TIMEOUT: If auth initialization takes longer than 10s, force loading to false.
    // This prevents the app from being stuck on "CARREGANDO..." forever if Supabase is unreachable.
    const safetyTimeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('Auth initialization timed out after 10s. Forcing loading=false.');
          return false;
        }
        return prev;
      });
    }, 10000);

    let didFinishInit = false;

    // Use onAuthStateChange as the SINGLE source of truth (recommended by Supabase).
    // This handles INITIAL_SESSION (newer SDK), SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth event:', event);

        // Update session state for all events
        setSession(prev => {
          if (prev === newSession) return prev;
          return newSession;
        });

        if (
          (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
          newSession?.user
        ) {
          await loadProfile(newSession.user.id);
          // After the first session event resolves, mark loading as done
          if (!didFinishInit) {
            didFinishInit = true;
            clearTimeout(safetyTimeout);
            setLoading(false);
          }
        } else if (event === 'INITIAL_SESSION' && !newSession) {
          // No stored session exists — user is not logged in
          if (!didFinishInit) {
            didFinishInit = true;
            clearTimeout(safetyTimeout);
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          if (!didFinishInit) {
            didFinishInit = true;
            clearTimeout(safetyTimeout);
            setLoading(false);
          }
        }
      }
    );

    // FALLBACK: For older Supabase SDK versions that don't emit INITIAL_SESSION,
    // manually check the session after a short delay.
    const fallbackTimeout = setTimeout(async () => {
      if (didFinishInit) return; // Already handled by onAuthStateChange
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (didFinishInit) return; // Race: onAuthStateChange fired while we were waiting

        if (error) {
          console.error('Session error (fallback):', error);
        } else {
          setSession(currentSession);
          if (currentSession?.user) {
            await loadProfile(currentSession.user.id);
          }
        }
      } catch (err) {
        console.error('Auth init fallback error:', err);
      } finally {
        if (!didFinishInit) {
          didFinishInit = true;
          clearTimeout(safetyTimeout);
          setLoading(false);
        }
      }
    }, 500);

    return () => {
      clearTimeout(safetyTimeout);
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const handleSignIn = async (email: string, password: string) => {
    const { session: newSession } = await authSignIn(email, password);
    // onAuthStateChange will handle setting session/user, but we also set it here
    // for immediate feedback
    setSession(newSession);
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
      // Small delay to allow the trigger to create the profile
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
