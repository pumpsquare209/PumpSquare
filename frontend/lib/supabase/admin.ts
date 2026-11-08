import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __supabaseAdmin: SupabaseClient | undefined;
}

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin credentials not configured (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).");
  }

  if (!globalThis.__supabaseAdmin) {
    globalThis.__supabaseAdmin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return globalThis.__supabaseAdmin;
}

export function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase public credentials not configured (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  }

  return createClient(url, anonKey);
}

export async function adminQuery<T>(queryFn: (client: SupabaseClient) => Promise<{ data: T; error: unknown }>): Promise<T> {
  const client = getSupabaseAdmin();
  const { data, error } = await queryFn(client);
  if (error) throw error;
  return data;
}

export async function adminQueryOne<T>(queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: unknown }>) {
  const data = await adminQuery(queryFn);
  return data as T;
}