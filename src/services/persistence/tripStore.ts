/**
 * AeroDAG Phase 6 — Supabase & In-Memory Trip Persistence Stores
 * 
 * Provides:
 * - ITripStore interface
 * - SupabaseTripStore: Production persistence backed by Supabase Postgres & RLS
 * - InMemoryTripStore: Fallback for offline mode and isolated unit tests
 * - Idempotency protection on double-click
 * - Schema version validation & PII sanitization
 */

import { ConfirmedBookingRecord } from '../../types/travelBooking';
import { isSupabaseConfigured, supabase } from './supabaseClient';

export interface ITripStore {
  saveDraft(trip: Partial<ConfirmedBookingRecord>): Promise<ConfirmedBookingRecord>;
  saveSimulatedBooking(
    bookingData: ConfirmedBookingRecord,
    idempotencyKey: string
  ): Promise<{ booking: ConfirmedBookingRecord; isExisting?: boolean }>;
  listTrips(): Promise<ConfirmedBookingRecord[]>;
  getTrip(tripIdOrSandboxRef: string): Promise<ConfirmedBookingRecord | null>;
  cancelTrip(tripIdOrSandboxRef: string): Promise<boolean>;
  deleteTrip(tripIdOrSandboxRef: string): Promise<boolean>;
}

/**
 * Parses natural language travel dates (e.g. "14–20 Nov 2026") into YYYY-MM-DD
 */
export function parseDateRange(datesStr?: string): { startDate: string | null; endDate: string | null } {
  if (!datesStr) return { startDate: null, endDate: null };
  const clean = datesStr.trim();
  const rangeMatch = clean.match(/^(\d{1,2})\s*[–-]\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  if (rangeMatch) {
    const [, startDay, endDay, monthName, year] = rangeMatch;
    const m = months[monthName.toLowerCase().slice(0, 3)] || '01';
    const sD = startDay.padStart(2, '0');
    const eD = endDay.padStart(2, '0');
    return {
      startDate: `${year}-${m}-${sD}`,
      endDate: `${year}-${m}-${eD}`
    };
  }
  return { startDate: null, endDate: null };
}

/**
 * Strips all payment credentials, emails, and phone numbers before database persistence
 */
export function sanitizePlanForStorage(plan: ConfirmedBookingRecord): ConfirmedBookingRecord {
  const sanitized = JSON.parse(JSON.stringify(plan));
  if (Array.isArray(sanitized.passengers)) {
    sanitized.passengers = sanitized.passengers.map((p: any) => {
      const { email, phone, card, cvv, upi, aadhaarOrId, passportNumber, ...safePax } = p;
      return safePax;
    });
  }
  delete (sanitized as any).paymentDetails;
  delete (sanitized as any).cardDetails;
  delete (sanitized as any).upiId;
  delete (sanitized as any).cvv;
  delete (sanitized as any).email;
  delete (sanitized as any).phone;
  return sanitized;
}

/**
 * Validates plan JSONB schema on read. Skips invalid or corrupted records without crashing.
 */
export function validateTripPlan(tripRow: any): ConfirmedBookingRecord | null {
  if (!tripRow) return null;
  if (tripRow.schema_version !== 1) {
    console.warn(`[AeroDAG] Skipping trip ${tripRow.id}: unknown schema_version ${tripRow.schema_version}`);
    return null;
  }
  const plan = tripRow.plan;
  if (!plan || typeof plan !== 'object') {
    console.warn(`[AeroDAG] Skipping trip ${tripRow.id}: malformed plan JSONB`);
    return null;
  }
  if (!plan.bookingId || !plan.destination || typeof plan.totalPaidINR !== 'number') {
    console.warn(`[AeroDAG] Skipping trip ${tripRow.id}: missing essential trip properties`);
    return null;
  }
  return {
    ...plan,
    status: tripRow.status === 'cancelled' ? 'CANCELLED' : (plan.status || 'SIMULATED')
  };
}

/**
 * Production Supabase Trip Store
 */
export class SupabaseTripStore implements ITripStore {
  private static instance: SupabaseTripStore | null = null;

  static getInstance(): SupabaseTripStore {
    if (!this.instance) {
      this.instance = new SupabaseTripStore();
    }
    return this.instance;
  }

  async saveDraft(trip: Partial<ConfirmedBookingRecord>): Promise<ConfirmedBookingRecord> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured');
    }

    const user = (await supabase.auth.getUser()).data?.user;
    if (!user) {
      throw new Error('User is not authenticated. Session required for trip persistence.');
    }

    const destination = trip.destination || 'Unspecified';
    const totalINR = trip.totalPaidINR || 0;
    const sanitized = sanitizePlanForStorage(trip as ConfirmedBookingRecord);

    if (trip.bookingId) {
      const { data: existing } = await supabase
        .from('trips')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .filter('plan->>bookingId', 'eq', trip.bookingId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('trips')
          .update({
            destination,
            origin: trip.origin || null,
            adults: trip.passengers?.filter(p => p.type !== 'CHILD').length || 1,
            children_ages: trip.passengers?.filter(p => p.type === 'CHILD').map(p => p.age || 0) || [],
            budget_inr: totalINR,
            total_inr: totalINR,
            plan: sanitized,
            schema_version: 1
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (!error && data) {
          return validateTripPlan(data) || (sanitized as ConfirmedBookingRecord);
        }
      }
    }

    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: user.id,
        status: 'draft',
        destination,
        origin: trip.origin || null,
        adults: trip.passengers?.filter(p => p.type !== 'CHILD').length || 1,
        children_ages: trip.passengers?.filter(p => p.type === 'CHILD').map(p => p.age || 0) || [],
        budget_inr: totalINR,
        total_inr: totalINR,
        plan: sanitized,
        schema_version: 1
      })
      .select()
      .single();

    if (error) throw new Error(`Supabase saveDraft error: ${error.message}`);
    return validateTripPlan(data) || (sanitized as ConfirmedBookingRecord);
  }

  async saveSimulatedBooking(
    bookingData: ConfirmedBookingRecord,
    idempotencyKey: string
  ): Promise<{ booking: ConfirmedBookingRecord; isExisting?: boolean }> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured');
    }

    const user = (await supabase.auth.getUser()).data?.user;
    if (!user) {
      throw new Error('User is not authenticated. Session required for trip persistence.');
    }

    const { startDate, endDate } = parseDateRange(bookingData.travelDates);
    const sanitizedPlan = sanitizePlanForStorage(bookingData);
    const adultsCount = bookingData.passengers?.filter(p => p.type !== 'CHILD').length || 1;
    const childrenAges = bookingData.passengers?.filter(p => p.type === 'CHILD').map(p => p.age || 0) || [];
    const totalINR = bookingData.totalPaidINR;
    const sandboxRef = bookingData.bookingId; // e.g. "AD-GOA-0142 (sandbox)"

    // 1. First check if a booking with this idempotency key already exists (Double-submit guard)
    const { data: existingBooking, error: checkError } = await supabase
      .from('bookings')
      .select('*, trips:trip_id(*)')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingBooking && existingBooking.trips) {
      const validatedPlan = validateTripPlan(existingBooking.trips);
      if (validatedPlan) {
        return { booking: validatedPlan, isExisting: true };
      }
    }

    // 2. Insert into public.trips
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .insert({
        user_id: user.id,
        status: 'simulated',
        destination: bookingData.destination,
        origin: bookingData.origin || null,
        start_date: startDate,
        end_date: endDate,
        adults: adultsCount,
        children_ages: childrenAges,
        budget_inr: totalINR,
        total_inr: totalINR,
        plan: sanitizedPlan,
        schema_version: 1
      })
      .select()
      .single();

    if (tripError) {
      throw new Error(`Failed to insert trip: ${tripError.message}`);
    }

    // 3. Insert into public.bookings
    const { error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        trip_id: tripData.id,
        sandbox_ref: sandboxRef,
        idempotency_key: idempotencyKey,
        state: 'simulated',
        total_inr: totalINR
      });

    if (bookingError) {
      // If unique constraint hit on concurrent double submit, fetch and return existing
      if (
        bookingError.code === '23505' ||
        bookingError.message?.includes('idempotency_key') ||
        bookingError.message?.includes('unique')
      ) {
        const { data: duplicateBooking } = await supabase
          .from('bookings')
          .select('*, trips:trip_id(*)')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();

        if (duplicateBooking && duplicateBooking.trips) {
          const validated = validateTripPlan(duplicateBooking.trips);
          if (validated) return { booking: validated, isExisting: true };
        }
      }
      throw new Error(`Failed to insert booking: ${bookingError.message}`);
    }

    const validated = validateTripPlan(tripData);
    return { booking: validated || sanitizedPlan, isExisting: false };
  }

  async listTrips(): Promise<ConfirmedBookingRecord[]> {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Supabase listTrips error: ${error.message}`);
    }

    if (!data || !Array.isArray(data)) return [];

    const trips: ConfirmedBookingRecord[] = [];
    for (const row of data) {
      const plan = validateTripPlan(row);
      if (plan) {
        trips.push(plan);
      }
    }
    return trips;
  }

  async getTrip(tripIdOrSandboxRef: string): Promise<ConfirmedBookingRecord | null> {
    if (!isSupabaseConfigured || !supabase) return null;

    // Check by sandbox_ref in bookings first
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('*, trips:trip_id(*)')
      .eq('sandbox_ref', tripIdOrSandboxRef)
      .maybeSingle();

    if (bookingData && bookingData.trips) {
      return validateTripPlan(bookingData.trips);
    }

    // Try query by trip uuid
    const { data: tripData } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripIdOrSandboxRef)
      .maybeSingle();

    if (tripData) {
      return validateTripPlan(tripData);
    }

    return null;
  }

  async cancelTrip(tripIdOrSandboxRef: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    // Update bookings state
    await supabase
      .from('bookings')
      .update({ state: 'cancelled' })
      .eq('sandbox_ref', tripIdOrSandboxRef);

    // Update trips status
    const { error } = await supabase
      .from('trips')
      .update({ status: 'cancelled' })
      .or(`id.eq.${tripIdOrSandboxRef}`);

    return !error;
  }

  async deleteTrip(tripIdOrSandboxRef: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    // Deleting from trips cascades to bookings
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripIdOrSandboxRef);

    return !error;
  }
}

export const LOCAL_STORAGE_TRIPS_KEY = 'aerodag:v1:trips';

/**
 * In-Memory & Device Storage Trip Store (Offline mode & Unit Tests)
 * Uses versioned localStorage key 'aerodag:v1:trips' with zero-PII sanitization
 */
export class InMemoryTripStore implements ITripStore {
  private static instance: InMemoryTripStore | null = null;
  private trips: Map<string, any> = new Map();
  private bookings: Map<string, any> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  static getInstance(): InMemoryTripStore {
    if (!this.instance) {
      this.instance = new InMemoryTripStore();
    }
    return this.instance;
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_TRIPS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.trips)) {
        for (const t of parsed.trips) {
          if (t && t.id) this.trips.set(t.id, t);
        }
      }
      if (Array.isArray(parsed.bookings)) {
        for (const b of parsed.bookings) {
          if (b && b.idempotency_key) this.bookings.set(b.idempotency_key, b);
        }
      }
    } catch (err) {
      console.warn('[TripStore] Failed to load offline trips from localStorage:', err);
    }
  }

  private syncToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const payload = {
        version: 1,
        trips: Array.from(this.trips.values()).map((t) => ({
          ...t,
          plan: sanitizePlanForStorage(t.plan)
        })),
        bookings: Array.from(this.bookings.values())
      };
      window.localStorage.setItem(LOCAL_STORAGE_TRIPS_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('[TripStore] Failed to sync offline trips to localStorage:', err);
    }
  }

  clear(): void {
    this.trips.clear();
    this.bookings.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(LOCAL_STORAGE_TRIPS_KEY);
      } catch {
        // Safe fallback
      }
    }
  }

  async saveDraft(trip: Partial<ConfirmedBookingRecord>): Promise<ConfirmedBookingRecord> {
    const sanitized = sanitizePlanForStorage(trip as ConfirmedBookingRecord);
    let id = trip.bookingId;
    if (id) {
      for (const [key, item] of this.trips.entries()) {
        if (key === id || item.id === id || item.plan?.bookingId === id) {
          item.destination = trip.destination || item.destination;
          item.plan = sanitized;
          this.trips.set(key, item);
          this.syncToStorage();
          return sanitized;
        }
      }
    } else {
      id = `draft_${Date.now()}`;
      sanitized.bookingId = id;
    }

    this.trips.set(id, {
      id,
      status: 'draft',
      destination: trip.destination || 'Unspecified',
      plan: sanitized,
      schema_version: 1,
      created_at: new Date().toISOString()
    });
    this.syncToStorage();
    return sanitized;
  }

  async saveSimulatedBooking(
    bookingData: ConfirmedBookingRecord,
    idempotencyKey: string
  ): Promise<{ booking: ConfirmedBookingRecord; isExisting?: boolean }> {
    // Idempotency check: exactly 1 booking row per idempotency key
    if (this.bookings.has(idempotencyKey)) {
      const existing = this.bookings.get(idempotencyKey);
      const trip = this.trips.get(existing.trip_id);
      return { booking: trip.plan, isExisting: true };
    }

    const tripId = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sanitized = sanitizePlanForStorage(bookingData);

    this.trips.set(tripId, {
      id: tripId,
      status: 'simulated',
      destination: bookingData.destination,
      total_inr: bookingData.totalPaidINR,
      plan: sanitized,
      schema_version: 1,
      created_at: new Date().toISOString()
    });

    this.bookings.set(idempotencyKey, {
      id: `bk_${Date.now()}`,
      trip_id: tripId,
      sandbox_ref: bookingData.bookingId,
      idempotency_key: idempotencyKey,
      state: 'simulated',
      total_inr: bookingData.totalPaidINR,
      created_at: new Date().toISOString()
    });

    this.syncToStorage();
    return { booking: sanitized, isExisting: false };
  }

  async listTrips(): Promise<ConfirmedBookingRecord[]> {
    const list: ConfirmedBookingRecord[] = [];
    for (const item of this.trips.values()) {
      if (item.status !== 'cancelled') {
        const validated = validateTripPlan(item);
        if (validated) list.push(validated);
      }
    }
    return list.reverse();
  }

  async getTrip(tripIdOrSandboxRef: string): Promise<ConfirmedBookingRecord | null> {
    for (const item of this.trips.values()) {
      if (item.id === tripIdOrSandboxRef || item.plan?.bookingId === tripIdOrSandboxRef) {
        return validateTripPlan(item);
      }
    }
    return null;
  }

  async cancelTrip(tripIdOrSandboxRef: string): Promise<boolean> {
    for (const [key, item] of this.trips.entries()) {
      if (item.id === tripIdOrSandboxRef || item.plan?.bookingId === tripIdOrSandboxRef) {
        item.status = 'cancelled';
        this.trips.set(key, item);
        this.syncToStorage();
        return true;
      }
    }
    return false;
  }

  async deleteTrip(tripIdOrSandboxRef: string): Promise<boolean> {
    for (const [key, item] of this.trips.entries()) {
      if (item.id === tripIdOrSandboxRef || item.plan?.bookingId === tripIdOrSandboxRef) {
        this.trips.delete(key);
        this.syncToStorage();
        return true;
      }
    }
    return false;
  }
}

/**
 * Returns the appropriate TripStore instance based on runtime environment & offline status
 */
export function getTripStore(isOffline: boolean = false): ITripStore {
  if (isSupabaseConfigured && !isOffline && supabase) {
    return SupabaseTripStore.getInstance();
  }
  return InMemoryTripStore.getInstance();
}
