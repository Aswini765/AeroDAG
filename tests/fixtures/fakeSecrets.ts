/**
 * Fake credentials for security tests (secret scanner, log redaction, error sanitizer).
 *
 * These are NOT real keys. They are assembled from pieces at runtime so that the
 * repository never contains a string that looks like a live credential, which keeps
 * GitHub push protection (and anyone reading the code) from mistaking them for leaks.
 * Each value still matches the shape the app's detectors look for.
 */
const join = (...parts: string[]) => parts.join('');

/** Google AI Studio style key: "AIzaSy" + 30+ chars */
export const FAKE_GOOGLE_API_KEY = join('AI', 'za', 'Sy', 'FAKE0TEST0KEY0NOT0REAL0000000000');

/** A second, different Google-style key (for nested-field tests) */
export const FAKE_GOOGLE_API_KEY_2 = join('AI', 'za', 'Sy', 'FAKE1TEST1KEY1NOT1REAL1111111111');

/** Gemini "AQ." style token: "AQ." + 30+ chars */
export const FAKE_GEMINI_TOKEN = join('AQ', '.', 'FAKE_TEST_TOKEN_NOT_REAL_000000000');

/** Stripe style secret key: "sk_live_" + 24+ alphanumerics */
export const FAKE_STRIPE_SECRET_KEY = join('sk', '_', 'live', '_', 'FAKE0TEST0KEY0NOT0REAL0000');
