import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";

// Single-user mode: No authentication required
// All functions return null to bypass auth checks

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<null> {
  // Single-user mode: always return null (no user required)
  return null;
}

export async function requireCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<never> {
  // Single-user mode: throw error to indicate this function should not be used
  throw new Error("Authentication disabled in single-user mode. Use getCurrentUser() and handle null case.");
}

export async function getCurrentUserForAction(
  ctx: ActionCtx
): Promise<null> {
  // Single-user mode: always return null (no user required)
  return null;
}

export async function requireCurrentUserForAction(
  ctx: ActionCtx
): Promise<never> {
  // Single-user mode: throw error to indicate this function should not be used
  throw new Error("Authentication disabled in single-user mode. Use getCurrentUserForAction() and handle null case.");
}

// Helper function to get a dummy user ID when needed for database operations (deprecated)
export function getDummyUserId(): string {
  return "single-user-mode";
}

// Helper function to check if we're in single-user mode (always true now)
export function isSingleUserMode(): boolean {
  return true;
}