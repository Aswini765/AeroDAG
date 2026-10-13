# AeroDAG — Supabase Schema Setup

This directory contains the database migrations for AeroDAG's Supabase persistence and authentication layer.

## How to Apply the Migration in Supabase SQL Editor

1. **Log in to Supabase Dashboard:**
   Navigate to [https://supabase.com/dashboard](https://supabase.com/dashboard) and select your AeroDAG project (`ayjreobecongmizuecab`).

2. **Open the SQL Editor:**
   Click the **SQL Editor** tab in the left sidebar (icon with `>_`).

3. **Create a New Query:**
   Click **+ New Query**.

4. **Copy & Paste Migration SQL:**
   Open [`supabase/migrations/0001_init.sql`](./migrations/0001_init.sql), copy the entire SQL script, and paste it into the editor pane.

5. **Run the Script:**
   Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
   Verify that the output shows `Success. No rows returned` or indicates successful execution.

6. **Verify Tables & Policies in Table Editor:**
   - Under **Table Editor**, confirm that `trips` and `bookings` exist.
   - Under **Authentication -> Policies**, confirm that Row Level Security (RLS) is enabled for both `trips` and `bookings`, with policies restricting operations to `auth.uid() = user_id`.

## Schema Overview

- **`trips` Table**:
  - Multi-tenant trip state (`draft`, `simulated`, `cancelled`).
  - Stores destination, dates, traveller headcount, total cost in INR, and full validated `plan` JSONB.
  - Automatically maintained `updated_at` trigger.
  - Strict RLS ensuring users only access their own records.

- **`bookings` Table**:
  - References `trips(id)` with cascading deletion.
  - Tracks human-readable sandbox reference (e.g. `AD-GOA-0142`) and client-generated `idempotency_key`.
  - Unique constraint on `(user_id, idempotency_key)` to guarantee double-submission idempotency.
  - Strict RLS preventing cross-user booking injection.
