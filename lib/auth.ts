import { cookies } from "next/headers";
import { adminAuth } from "./firebase-admin";

/**
 * Returns decoded Firebase session user or null
 */
export async function getCurrentUser() {
  const cookieStore = await cookies(); // <-- FIX (await required)

  const token = cookieStore.get("__session")?.value;
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(token, true);
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Throws if user not authenticated (server usage)
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
