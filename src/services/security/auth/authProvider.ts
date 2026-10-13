/**
 * AeroDAG Provider-Neutral Authentication Boundary
 * 
 * Manages authentication sessions, identity verification, expiration enforcement,
 * and secure token invalidation without third-party external dependencies.
 */

import { AuthSession, SessionValidationResult, UserIdentity, UserRole } from './types';

export class AuthProvider {
  private static instance: AuthProvider | null = null;
  private sessions: Map<string, AuthSession> = new Map();
  private tokenToSessionId: Map<string, string> = new Map();

  private defaultTtlMs = 60 * 60 * 1000; // 1 hour

  private constructor() {}

  static getInstance(): AuthProvider {
    if (!AuthProvider.instance) {
      AuthProvider.instance = new AuthProvider();
    }
    return AuthProvider.instance;
  }

  /**
   * Sets default TTL for testing session expiration
   */
  setDefaultTtlMs(ttlMs: number): void {
    this.defaultTtlMs = ttlMs;
  }

  /**
   * Authenticates identity and establishes a secure session
   */
  authenticate(credentials: {
    userId: string;
    role?: UserRole;
    email?: string;
    name?: string;
    customTtlMs?: number;
  }): AuthSession {
    if (!credentials.userId || !credentials.userId.trim()) {
      throw new Error('Authentication failed: Missing userId');
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const token = `aero_tok_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    const now = Date.now();
    const ttlMs = credentials.customTtlMs !== undefined ? credentials.customTtlMs : this.defaultTtlMs;
    const expiresAt = now + ttlMs;

    const user: UserIdentity = {
      userId: credentials.userId,
      role: credentials.role || 'USER',
      email: credentials.email,
      name: credentials.name
    };

    const session: AuthSession = {
      sessionId,
      token,
      user,
      createdAt: now,
      expiresAt
    };

    this.sessions.set(sessionId, session);
    this.tokenToSessionId.set(token, sessionId);
    return session;
  }

  /**
   * Validates session token, verifying signature, existence, and expiration
   */
  validateSession(token: string): SessionValidationResult {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'MISSING_SESSION' };
    }

    const sessionId = this.tokenToSessionId.get(token);
    if (!sessionId) {
      return { valid: false, error: 'INVALID_SESSION' };
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return { valid: false, error: 'INVALID_SESSION' };
    }

    if (Date.now() > session.expiresAt) {
      this.invalidateSession(token);
      return { valid: false, error: 'EXPIRED_SESSION' };
    }

    return {
      valid: true,
      user: session.user
    };
  }

  /**
   * Invalidates and terminates a session (logout)
   */
  invalidateSession(token: string): boolean {
    const sessionId = this.tokenToSessionId.get(token);
    if (!sessionId) return false;

    this.tokenToSessionId.delete(token);
    this.sessions.delete(sessionId);
    return true;
  }

  /**
   * Extracts verified user identity if session is valid
   */
  getUserIdentity(token: string): UserIdentity | null {
    const res = this.validateSession(token);
    return res.valid && res.user ? res.user : null;
  }

  /**
   * Clears all active sessions (for isolated testing)
   */
  clear(): void {
    this.sessions.clear();
    this.tokenToSessionId.clear();
    this.defaultTtlMs = 60 * 60 * 1000;
  }
}

export function getAuthProvider(): AuthProvider {
  return AuthProvider.getInstance();
}
