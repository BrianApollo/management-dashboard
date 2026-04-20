/**
 * Auth API
 *
 * Handles login, session restore, and logout via /api/auth/ endpoints.
 */

import type { User } from './types';

/**
 * Verify credentials via the server-side login endpoint.
 */
export async function login(
  email: string,
  password: string
): Promise<{ user: User; token: string } | null> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) return null;
    return (await response.json()) as { user: User; token: string };
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return null;
  }
}

/**
 * Restore session from JWT token via /api/auth/me.
 */
export async function restoreSession(token: string): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { user: User };
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Restore session from HttpOnly cookie.
 */
export async function restoreSessionFromCookie(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!response.ok) return null;
    const data = (await response.json()) as { user: User };
    return data.user ?? null;
  } catch {
    return null;
  }
}

/**
 * Logout — clears server-side session.
 */
export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } catch {
    // Best effort
  }
}
