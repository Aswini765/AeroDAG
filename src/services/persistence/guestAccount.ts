/**
 * Guest-first accounts.
 *
 * Everyone starts as an anonymous guest (no sign-up wall). We only ask for an email
 * when it is useful to the traveller: after "Save trip", after booking, or when they
 * choose "Sign in". One email form handles both cases:
 *
 *  - New email      -> attach it to the current guest account (same user id, so every
 *                      trip saved so far simply stays). They confirm via the emailed link.
 *  - Existing email -> it belongs to an account from an earlier visit / another device.
 *                      We send a sign-in link. Trips saved as a guest on THIS device are
 *                      remembered locally and copied into that account once they sign in.
 */
import type { ConfirmedBookingRecord } from '../../types/travelBooking';
import { isSupabaseConfigured, supabase, linkEmailToCurrentUser } from './supabaseClient';
import type { ITripStore } from './tripStore';

const PENDING_KEY = 'aerodag:v1:guest-carry-over';

interface PendingTrip {
  kind: 'draft' | 'booking';
  guestUserId: string | null;
  record: ConfirmedBookingRecord;
}

export interface EmailResult {
  success: boolean;
  /** 'linked' = this guest account now has the email; 'signin' = sign-in link sent to an existing account */
  mode?: 'linked' | 'signin';
  message?: string;
  error?: string;
}

function readPending(): PendingTrip[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writePending(list: PendingTrip[]) {
  try {
    if (list.length) localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-20)));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage unavailable: carry-over is best effort */
  }
}

/** Remember a trip a guest saved or booked, so it can follow them into an existing account. */
export function rememberGuestTrip(kind: 'draft' | 'booking', record: ConfirmedBookingRecord, guestUserId: string | null) {
  const list = readPending().filter((p) => p.record.bookingId !== record.bookingId);
  list.push({ kind, guestUserId, record });
  writePending(list);
}

/**
 * After a real (non-guest) sign-in: copy guest trips from this device into the account.
 * Trips already owned by this user id (they linked an email to the same guest) are skipped.
 * Returns how many trips were added.
 */
export async function carryOverGuestTrips(currentUserId: string, store: ITripStore): Promise<number> {
  const pending = readPending();
  if (!pending.length) return 0;
  let added = 0;
  const remaining: PendingTrip[] = [];
  for (const p of pending) {
    if (p.guestUserId === currentUserId) continue; // already in this account
    try {
      if (p.kind === 'booking') {
        await store.saveSimulatedBooking(p.record, `carry_${p.record.bookingId}`);
      } else {
        await store.saveDraft(p.record);
      }
      added += 1;
    } catch {
      remaining.push(p); // try again next sign-in
    }
  }
  writePending(remaining);
  return added;
}

/** Send a passwordless sign-in link to an existing account. */
export async function sendSignInLink(email: string): Promise<EmailResult> {
  if (!isSupabaseConfigured || !supabase) return { success: false, error: 'Accounts are not available right now.' };
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined, shouldCreateUser: true }
  });
  if (error) {
    const msg = error.message || '';
    if (/rate|too many/i.test(msg) || (error as any).status === 429) {
      return { success: false, error: 'Too many emails right now — please try again in a little while.' };
    }
    return { success: false, error: msg || 'Could not send the sign-in link.' };
  }
  return { success: true, mode: 'signin', message: `We emailed a sign-in link to ${email.trim()}. Open it on this device and your trips from here will be added to your account.` };
}

/** The single "continue with email" action used by Save trip, booking and Sign in. */
export async function continueWithEmail(email: string): Promise<EmailResult> {
  const clean = email.trim().toLowerCase();
  if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  const linked = await linkEmailToCurrentUser(clean);
  if (linked.success) {
    return { success: true, mode: 'linked', message: `Check ${clean} and click the link to confirm. Your trips are already saved here.` };
  }
  // Email already belongs to an account (earlier visit or another device): sign in instead.
  if (/already|registered|exists|in use/i.test(linked.error || '')) {
    return sendSignInLink(clean);
  }
  return { success: false, error: linked.error || 'Could not send the link. Please try again.' };
}
