import React, { useState } from 'react';
import { Mail, Check, X } from 'lucide-react';

interface KeepTripsCardProps {
  /** e.g. "Saved to My Trips" or "Booking confirmed" */
  title: string;
  description?: string;
  defaultEmail?: string;
  onSubmitEmail: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDismiss: () => void;
  id?: string;
}

/**
 * Optional, non-blocking email prompt shown at the moment it is useful
 * (after saving or booking). The trip is already saved; this only adds
 * the ability to see it on any device.
 */
export const KeepTripsCard: React.FC<KeepTripsCardProps> = ({
  title,
  description = 'Add your email to see your trips on any device. No password — we email you a link.',
  defaultEmail = '',
  onSubmitEmail,
  onDismiss,
  id = 'keep-trips-card'
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await onSubmitEmail(email.trim());
      if (res.success) setDone(res.message || 'Check your email for the link.');
      else setError(res.error || 'Could not send the link. Please try again.');
    } catch (err: any) {
      setError(err?.message || 'Could not send the link. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      id={id}
      data-testid={id}
      className="card-consumer p-4 sm:p-5 bg-[#F5F6F3] border-[#E2E6E1] text-left space-y-3 animate-fade-in-slide"
      role="region"
      aria-label="Keep your trips"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold text-[#15201D]">
            <span className="h-5 w-5 rounded-full bg-[#0E6B59] text-white flex items-center justify-center">
              <Check className="h-3 w-3" aria-hidden="true" />
            </span>
            <span>{title}</span>
          </div>
          {!done && <p className="text-xs sm:text-sm text-[#55625E]">{description}</p>}
        </div>
        <button type="button" onClick={onDismiss} className="text-[#55625E] hover:text-[#15201D] p-1 shrink-0" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>

      {done ? (
        <p className="text-xs sm:text-sm text-[#0E6B59] font-medium flex items-start gap-2" role="status">
          <Mail className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{done}</span>
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
          <label htmlFor={`${id}-email`} className="sr-only">Email</label>
          <input
            id={`${id}-email`}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            placeholder="you@gmail.com"
            disabled={busy}
            className="flex-1 bg-white border border-[#E2E6E1] rounded-xl px-3.5 py-2 text-sm text-[#15201D] focus:ring-2 focus:ring-[#7CC4B3] focus:outline-none"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !email.trim()} className="btn-primary py-2 px-4 text-sm justify-center flex-1 sm:flex-none">
              {busy ? 'Sending…' : 'Email me a link'}
            </button>
            <button type="button" onClick={onDismiss} className="btn-ghost py-2 px-3 text-sm">
              Not now
            </button>
          </div>
        </form>
      )}
      {error && <p className="text-xs text-[#DC2626] font-medium" role="alert">{error}</p>}
    </div>
  );
};
