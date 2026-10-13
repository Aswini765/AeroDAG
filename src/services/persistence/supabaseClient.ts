/**
 * AeroDAG Phase 6 — Supabase Client & Auth Configuration
 * 
 * Provides:
 * 1. Supabase client initialized with browser-safe publishable key
 * 2. Automatic anonymous session initialization
 * 3. Email linking to preserve guest user ID across devices
 * 4. Offline fallback detection
 */

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// Retrieve credentials safely across Vite client and Node.js environments
const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return String(import.meta.env[key]).trim();
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return String(process.env[key]).trim();
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY');

// Verify credentials exist and are not empty
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('http')
);

// Single client instance
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : (null as unknown as SupabaseClient);

/**
 * Initializes authentication on application launch.
 * If no session exists, automatically signs in anonymously to provision
 * a private multi-tenant guest account for the visitor.
 */
export async function initializeAuth(): Promise<{
  session: Session | null;
  user: User | null;
  isAnonymous: boolean;
  isOffline: boolean;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { session: null, user: null, isAnonymous: true, isOffline: true };
  }

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('AeroDAG: Supabase getSession error, falling back to offline:', sessionError.message);
      return { session: null, user: null, isAnonymous: true, isOffline: true };
    }

    if (session && session.user) {
      const isAnon = session.user.is_anonymous ?? (!session.user.email);
      return {
        session,
        user: session.user,
        isAnonymous: isAnon,
        isOffline: false
      };
    }

    // No existing session -> Provision anonymous guest user
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError) {
      console.warn('AeroDAG: Supabase anonymous sign-in failed, offline mode active:', anonError.message);
      return { session: null, user: null, isAnonymous: true, isOffline: true };
    }

    return {
      session: anonData.session,
      user: anonData.user,
      isAnonymous: true,
      isOffline: false
    };
  } catch (err: any) {
    console.warn('AeroDAG: Supabase unreachable, offline mode active:', err?.message || err);
    return { session: null, user: null, isAnonymous: true, isOffline: true };
  }
}

/**
 * Links an email address to the CURRENT anonymous user via magic link.
 * Preserves the exact same user_id and attached trips.
 */
export async function linkEmailToCurrentUser(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  try {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const currentSession = await supabase.auth.getSession();
    const currentUserId = currentSession.data.session?.user?.id;

    if (
      (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') ||
      (typeof import.meta !== 'undefined' && import.meta.env?.DEV)
    ) {
      console.log(`[AeroDAG Auth] Linking email ${cleanEmail} to user_id: ${currentUserId}`);
    }

    // updateUser({ email }, { emailRedirectTo }) links the email to the current authenticated user
    const { error } = await supabase.auth.updateUser(
      { email: cleanEmail },
      { emailRedirectTo: redirectTo }
    );

    if (error) {
      const msg = error.message || '';
      if (
        msg.toLowerCase().includes('rate') ||
        msg.toLowerCase().includes('too many') ||
        (error as any).status === 429
      ) {
        return { success: false, error: 'Too many emails right now — try again in a while.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send confirmation link' };
  }
}

export type { User, Session } from '@supabase/supabase-js';

/**
 * Signs out the current user session and provisions a fresh anonymous guest.
 */
export async function signOutAndResetGuest(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true };
  }

  try {
    await supabase.auth.signOut();
    // Provision fresh guest session if available
    try {
      await supabase.auth.signInAnonymously();
    } catch {
      // Graceful offline fallback
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to sign out' };
  }
}
