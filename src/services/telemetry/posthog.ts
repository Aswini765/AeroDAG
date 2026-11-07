/**
 * PostHog Telemetry Integration (Free Tier)
 * Tracks user engagement and conversion funnels:
 * - landing_view
 * - card_click
 * - input_submit
 * - plan_shown
 * - option_switched
 * - share_clicked
 * - book_on_clicked
 */

export interface PostHogEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
}

declare global {
  interface Window {
    posthog?: {
      capture: (eventName: string, properties?: Record<string, any>) => void;
      init?: (key: string, options?: Record<string, any>) => void;
      [key: string]: any;
    };
    __POSTHOG_EVENTS__?: PostHogEvent[];
    __POSTHOG_KEY__?: string;
  }
}

const POSTHOG_HOST = 'https://us.i.posthog.com';
const DEFAULT_KEY = 'phc_aerodag_free_tier_2026';

let distinctId: string = '';
const inMemoryEvents: PostHogEvent[] = [];

function getDistinctId(): string {
  if (distinctId) return distinctId;
  if (typeof window === 'undefined') return 'server_session';
  try {
    let id = localStorage.getItem('aerodag_ph_distinct_id');
    if (!id) {
      id = 'usr_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem('aerodag_ph_distinct_id', id);
    }
    distinctId = id;
    return id;
  } catch {
    return 'anon_' + Math.random().toString(36).substring(2, 9);
  }
}

export function initPostHog(): void {
  if (typeof window === 'undefined') return;

  if (!window.__POSTHOG_EVENTS__) {
    window.__POSTHOG_EVENTS__ = [];
  }

  // If PostHog CDN or stub isn't already set up on window:
  if (!window.posthog) {
    window.posthog = {
      capture: (eventName: string, properties?: Record<string, any>) => {
        capturePostHogEvent(eventName, properties);
      }
    };
  }
}

export function capturePostHogEvent(eventName: string, properties: Record<string, any> = {}): void {
  const timestamp = new Date().toISOString();
  const evt: PostHogEvent = {
    event: eventName,
    properties: {
      distinct_id: getDistinctId(),
      $current_url: typeof window !== 'undefined' ? window.location.href : '',
      ...properties
    },
    timestamp
  };

  inMemoryEvents.push(evt);

  if (typeof window !== 'undefined') {
    if (!window.__POSTHOG_EVENTS__) {
      window.__POSTHOG_EVENTS__ = [];
    }
    window.__POSTHOG_EVENTS__.push(evt);

    // If an official PostHog API key is provided, send to PostHog HTTP API
    const apiKey = (window as any).__POSTHOG_KEY__ || (typeof process !== 'undefined' && process.env?.VITE_POSTHOG_KEY) || DEFAULT_KEY;
    if (apiKey && apiKey !== 'disabled') {
      try {
        const payload = JSON.stringify({
          api_key: apiKey,
          event: eventName,
          properties: evt.properties,
          timestamp
        });
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
          navigator.sendBeacon(`${POSTHOG_HOST}/capture/`, new Blob([payload], { type: 'application/json' }));
        } else if (typeof fetch === 'function') {
          fetch(`${POSTHOG_HOST}/capture/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true
          }).catch(() => {
            // Silently suppress network errors for telemetry in offline/dev
          });
        }
      } catch {
        // Suppress errors during capture
      }
    }
  }
}

// Concrete helper functions for all 7 required PostHog events
export function trackLandingView(properties?: { page_version?: 'v_new' | 'v_old'; url?: string }): void {
  capturePostHogEvent('landing_view', {
    page_version: properties?.page_version || 'v_new',
    ...properties
  });
}

export function trackCardClick(properties: { destination: string; days?: number; pricePerPerson?: number; vibe?: string }): void {
  capturePostHogEvent('card_click', properties);
}

export function trackChipClick(properties: { chipId: string; label: string }): void {
  capturePostHogEvent('chip_click', properties);
}

export function trackDemoClick(properties?: { destination?: string }): void {
  capturePostHogEvent('demo_click', properties || { destination: 'Goa' });
}

export function trackInputSubmit(properties: { promptLength: number; hasVoice?: boolean; destinationMentioned?: string }): void {
  capturePostHogEvent('input_submit', properties);
}

export function trackPlanShown(properties: { destination: string; isRegion?: boolean; totalCost?: number; optionCount?: number }): void {
  capturePostHogEvent('plan_shown', properties);
}

export function trackOptionSwitched(properties: { optionTier: 'Budget' | 'Balanced' | 'Comfort'; totalCost?: number }): void {
  capturePostHogEvent('option_switched', properties);
}

export function trackShareClicked(properties: { destination?: string; method?: string }): void {
  capturePostHogEvent('share_clicked', properties);
}

export function trackBookOnClicked(properties: { provider: string; itemType?: string; url?: string }): void {
  capturePostHogEvent('book_on_clicked', properties);
}

export function getCapturedPostHogEvents(): PostHogEvent[] {
  if (typeof window !== 'undefined' && window.__POSTHOG_EVENTS__) {
    return [...window.__POSTHOG_EVENTS__];
  }
  return [...inMemoryEvents];
}

export function clearPostHogEventsForTesting(): void {
  inMemoryEvents.length = 0;
  if (typeof window !== 'undefined' && window.__POSTHOG_EVENTS__) {
    window.__POSTHOG_EVENTS__.length = 0;
  }
}

export function getPostHogEventsForTesting(): PostHogEvent[] {
  return getCapturedPostHogEvents();
}

