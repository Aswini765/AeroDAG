-- ==============================================================================
-- AeroDAG Phase 6 — Initial Schema Migration (0001_init.sql)
-- Multi-Tenant Sandbox Trip Persistence & Bookings with Strict RLS
-- ==============================================================================

-- 1. Helper Function: Automatic updated_at timestamp maintenance (Fixed search_path for Security Advisor)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Trips Table
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('draft', 'simulated', 'cancelled')),
  destination text NOT NULL,
  origin text,
  start_date date,
  end_date date,
  adults int NOT NULL CHECK (adults >= 1),
  children_ages int[] NOT NULL DEFAULT '{}',
  budget_inr integer NOT NULL CHECK (budget_inr >= 0),
  total_inr integer NOT NULL CHECK (total_inr >= 0),
  plan jsonb NOT NULL,
  schema_version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Trips updated_at Trigger
DROP TRIGGER IF EXISTS trigger_trips_updated_at ON public.trips;
CREATE TRIGGER trigger_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  sandbox_ref text NOT NULL,
  idempotency_key text NOT NULL,
  state text NOT NULL CHECK (state IN ('simulated', 'cancelled')),
  total_inr integer NOT NULL CHECK (total_inr >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_user_id_idempotency_key_key UNIQUE (user_id, idempotency_key)
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_trips_user_created ON public.trips(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_trip ON public.bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 7. Trips RLS Policies (Authenticated role: includes anonymous visitors signed in via auth.signInAnonymously())
DROP POLICY IF EXISTS "trips_select_own" ON public.trips;
CREATE POLICY "trips_select_own"
  ON public.trips FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "trips_insert_own" ON public.trips;
CREATE POLICY "trips_insert_own"
  ON public.trips FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "trips_update_own" ON public.trips;
CREATE POLICY "trips_update_own"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "trips_delete_own" ON public.trips;
CREATE POLICY "trips_delete_own"
  ON public.trips FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 8. Bookings RLS Policies
DROP POLICY IF EXISTS "bookings_select_own" ON public.bookings;
CREATE POLICY "bookings_select_own"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
CREATE POLICY "bookings_insert_own"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "bookings_update_own" ON public.bookings;
CREATE POLICY "bookings_update_own"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "bookings_delete_own" ON public.bookings;
CREATE POLICY "bookings_delete_own"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
