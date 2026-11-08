import "server-only";
import { cookies } from "next/headers";
import { AdminRole } from "@/lib/auth/roles";

const BACKEND_URL = process.env.BACKEND_URL;
const SESSION_COOKIE = "psq_admin_session";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

export async function getSessionUser(): Promise<AdminUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const response = await fetch(`${BACKEND_URL}/api/admin/auth/me`, {
      headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/admin/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
      cache: "no-store",
    });
  } catch {
    // Best effort
  }
}

export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/admin/auth/sessions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
      cache: "no-store",
    });
  } catch {
    // Best effort; session cleanup is handled by backend TTL
  }
}