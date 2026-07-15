import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    "NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY are not set. " +
      "Uploads will fail until these are configured in your environment variables."
  );
}

const url = supabaseUrl || "https://placeholder.supabase.co";
const key = serviceRoleKey || "placeholder-service-role-key";

// NEVER import this file from a client component. The service role key
// bypasses row level security, which is exactly what /api/upload needs
// in order to write rows and files on your behalf.
export const supabaseAdmin = createClient(url, key, {
  auth: { persistSession: false },
});

export const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "photos";