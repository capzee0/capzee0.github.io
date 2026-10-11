import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  isConfigured: boolean;

  authModalMode: 'signin' | 'signup';

  openAuthModal: (mode?: 'signin' | 'signup') => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: 'signin' | 'signup') => void;
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithGithub: () => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  isAuthModalOpen: false,
  authModalMode: 'signin',
  isConfigured: isSupabaseConfigured,

  openAuthModal: (mode = 'signin') => set({ isAuthModalOpen: true, authModalMode: mode }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  setAuthModalMode: (mode) => set({ authModalMode: mode }),

  initialize: async () => {
    try {
      set({ loading: true });
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user || null, loading: false });

      supabase.auth.onAuthStateChange((event, newSession) => {
        set({ session: newSession, user: newSession?.user || null, loading: false });
        if (event === 'SIGNED_IN' && newSession?.user) {
          if (window.location.pathname === '/' || window.location.pathname === '') {
            window.location.replace('/dashboard');
          }
        }
      });
    } catch {
      set({ loading: false });
    }
  },

  signInWithGoogle: async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: unknown) {
      return { error: (err as Error)?.message || 'Failed to sign in with Google' };
    }
  },

  signInWithGithub: async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: unknown) {
      return { error: (err as Error)?.message || 'Failed to sign in with GitHub' };
    }
  },

  signInWithEmail: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };
      set({ session: data.session, user: data.user, isAuthModalOpen: false });
      return { error: null };
    } catch (err: unknown) {
      return { error: (err as Error)?.message || 'Failed to sign in' };
    }
  },

  signUpWithEmail: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) return { error: error.message };
      set({ session: data.session, user: data.user, isAuthModalOpen: false });
      return { error: null };
    } catch (err: unknown) {
      return { error: (err as Error)?.message || 'Failed to sign up' };
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ session: null, user: null });
    } catch {
      set({ session: null, user: null });
    }
  },
}));
