import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SARVAM_API_KEY: z.string().min(10, "SARVAM_API_KEY appears invalid"),
  SARVAM_MODEL: z.string().default("sarvam-105b"),
  FRONTEND_ORIGIN: z.string().url(),
  CHAT_MAX_HISTORY: z.coerce.number().int().positive().default(12),
  CHAT_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;

function projectRefFromKey(key) {
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

const urlHost = new URL(env.SUPABASE_URL).hostname;
const keyRef = projectRefFromKey(env.SUPABASE_SERVICE_ROLE_KEY);

if (urlHost.endsWith(".supabase.co") && keyRef && urlHost !== `${keyRef}.supabase.co`) {
  console.error(
    `❌ SUPABASE_URL (${urlHost}) does not match the project in SUPABASE_SERVICE_ROLE_KEY (${keyRef}.supabase.co).`,
  );
  process.exit(1);
}