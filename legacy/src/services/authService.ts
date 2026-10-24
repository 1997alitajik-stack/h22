/**
 * Authentication and Access Control Service
 *
 * SECURITY DIRECTIVE:
 * - No user can grant themselves administrative privileges.
 * - Client-side state is NEVER trusted as a source of truth for authorization.
 * - Default authenticated role is VIEWER (read-only) unless an explicit,
 *   server-verified administrator record exists.
 * - candidate initial admin: 1997alitajik@gmail.com (pending explicit bootstrapping).
 */

import { UserRole } from '../types';

export interface AuthSession {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  roleTitle: string;
  isEmailVerified: boolean;
  avatarInitials: string;
  authProvider: 'DEMO_SIMULATION' | 'GOOGLE_WORKSPACE' | 'EMAIL_PASSWORD';
  isAuthenticated: boolean;
}

// Initial authorized admin candidate (strictly verified upon real auth connection)
export const CANDIDATE_INITIAL_ADMIN_EMAIL = '1997alitajik@gmail.com';

export class AuthService {
  /**
   * Evaluates if a given email is the designated initial bootstrap administrator candidate.
   * NOTE: In production Firestore, this is further validated against the /admins/{uid} collection.
   */
  static isCandidateAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    return email.trim().toLowerCase() === CANDIDATE_INITIAL_ADMIN_EMAIL.toLowerCase();
  }

  /**
   * Computes display initials from Persian or Latin names
   */
  static computeInitials(displayName: string): string {
    if (!displayName) return 'ک‌س';
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0].charAt(0)}‌${parts[parts.length - 1].charAt(0)}`;
  }

  /**
   * Verifies if an action is permitted based on verified role.
   * Used for defense-in-depth on the client while Firestore Security Rules enforce it on the server.
   */
  static canPerformAction(
    role: UserRole,
    action: 'CREATE_APPLICANT' | 'EDIT_APPLICANT' | 'VERIFY_EMPLOYMENT' | 'MANAGE_VACANCIES' | 'MANAGE_USERS' | 'EXPORT_DATA' | 'VIEW_DATA'
  ): boolean {
    switch (action) {
      case 'VIEW_DATA':
      case 'EXPORT_DATA':
        return true; // Both ADMIN and VIEWER can inspect authorized records and export
      case 'CREATE_APPLICANT':
      case 'EDIT_APPLICANT':
      case 'VERIFY_EMPLOYMENT':
      case 'MANAGE_VACANCIES':
      case 'MANAGE_USERS':
        return role === 'ADMIN';
      default:
        return false;
    }
  }
}
