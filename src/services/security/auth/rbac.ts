/**
 * AeroDAG Role-Based Access Control (RBAC) Authorizer
 * 
 * Enforces strict authorization boundaries between USER, ADMIN, and SYSTEM.
 * Prevents unauthorized access to trips, bookings, traces, admin endpoints, and privileged tools.
 */

import { UserIdentity, UserRole } from './types';

export class AuthorizationError extends Error {
  constructor(public readonly action: string, public readonly reason: string) {
    super(`Authorization Denied: ${reason} (action: ${action})`);
    this.name = 'AuthorizationError';
  }
}

export class RBACAuthorizer {
  /**
   * Verifies if user can access a specific trip resource
   */
  static canAccessTrip(user: UserIdentity, tripOwnerId: string): boolean {
    if (user.role === 'ADMIN' || user.role === 'SYSTEM') {
      return true;
    }
    return user.userId === tripOwnerId;
  }

  /**
   * Verifies if user can access a specific booking record
   */
  static canAccessBooking(user: UserIdentity, bookingOwnerId: string): boolean {
    if (user.role === 'ADMIN' || user.role === 'SYSTEM') {
      return true;
    }
    return user.userId === bookingOwnerId;
  }

  /**
   * Verifies if user can access admin observability / diagnostic endpoints
   */
  static canAccessAdmin(user: UserIdentity): boolean {
    return user.role === 'ADMIN';
  }

  /**
   * Verifies if user can inspect internal spans / traces
   */
  static canAccessInternalTraces(user: UserIdentity): boolean {
    return user.role === 'ADMIN' || user.role === 'SYSTEM';
  }

  /**
   * Verifies if identity can access provider credentials
   */
  static canAccessProviderCredentials(user: UserIdentity): boolean {
    return user.role === 'SYSTEM';
  }

  /**
   * Evaluates if caller possesses sufficient role privilege to invoke tool
   */
  static canInvokeTool(user: UserIdentity, requiredRole: UserRole): boolean {
    if (requiredRole === 'SYSTEM') {
      return user.role === 'SYSTEM';
    }
    if (requiredRole === 'ADMIN') {
      return user.role === 'ADMIN' || user.role === 'SYSTEM';
    }
    // USER role tools are accessible to USER, ADMIN, SYSTEM
    return true;
  }

  /**
   * Enforces trip access, throwing AuthorizationError on violation
   */
  static enforceTripAccess(user: UserIdentity, tripOwnerId: string): void {
    if (!this.canAccessTrip(user, tripOwnerId)) {
      throw new AuthorizationError('ACCESS_TRIP', `User '${user.userId}' cannot access trip owned by '${tripOwnerId}'`);
    }
  }

  /**
   * Enforces booking access, throwing AuthorizationError on violation
   */
  static enforceBookingAccess(user: UserIdentity, bookingOwnerId: string): void {
    if (!this.canAccessBooking(user, bookingOwnerId)) {
      throw new AuthorizationError('ACCESS_BOOKING', `User '${user.userId}' cannot access booking owned by '${bookingOwnerId}'`);
    }
  }

  /**
   * Enforces admin access, throwing AuthorizationError on violation
   */
  static enforceAdminAccess(user: UserIdentity): void {
    if (!this.canAccessAdmin(user)) {
      throw new AuthorizationError('ACCESS_ADMIN', `User '${user.userId}' with role '${user.role}' cannot access admin resources`);
    }
  }
}
