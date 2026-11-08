import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { ADMIN_ROLES } from "@/lib/auth/roles";

const BACKEND_URL = process.env.BACKEND_URL;

export type TeamMember = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export class TeamError extends Error {}

async function backend(path: string, options: RequestInit = {}) {
  const token = (await cookies()).get("psq_admin_session")?.value;
  const response = await fetch(`${BACKEND_URL}/api/admin${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { cookie: `psq_admin_session=${token}` } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || data.ok === false) {
    const message = typeof data.message === "string" ? data.message : "Request failed.";
    throw new TeamError(message);
  }
  return data;
}

export async function listTeam(): Promise<TeamMember[]> {
  const data = await backend("/users");
  return (data.members ?? []) as TeamMember[];
}

export const newMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: z.string().trim().min(2).max(80),
  role: z.enum(ADMIN_ROLES),
  password: z.string().min(12).max(200),
});

export async function createTeamMember(input: z.infer<typeof newMemberSchema>) {
  await backend("/users", { method: "POST", body: JSON.stringify(input) });
}

export const memberPatchSchema = z
  .object({
    role: z.enum(ADMIN_ROLES).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(12).max(200).optional(),
  })
  .refine((v) => v.role !== undefined || v.isActive !== undefined || v.password !== undefined, {
    message: "Nothing to update.",
  });

export async function updateTeamMember(
  actorId: string,
  targetId: string,
  patch: z.infer<typeof memberPatchSchema>,
) {
  if (actorId === targetId) {
    throw new TeamError("You cannot change your own role, status or password here.");
  }

  await backend(`/users/${targetId}`, { method: "PATCH", body: JSON.stringify(patch) });
  return true;
}
