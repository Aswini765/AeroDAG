/**
 * AeroDAG Authentication & RBAC Types
 */

export type UserRole = 'USER' | 'ADMIN' | 'SYSTEM';

export interface UserIdentity {
  userId: string;
  role: UserRole;
  email?: string;
  name?: string;
}

export interface AuthSession {
  sessionId: string;
  token: string;
  user: UserIdentity;
  createdAt: number;
  expiresAt: number;
}

export interface SessionValidationResult {
  valid: boolean;
  user?: UserIdentity;
  error?: 'EXPIRED_SESSION' | 'INVALID_SESSION' | 'REVOKED_SESSION' | 'MISSING_SESSION';
}

export interface AccessCheckContext {
  resourceOwnerId?: string;
  requiredRole?: UserRole;
  action?: string;
}
