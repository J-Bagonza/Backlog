import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// NEVER import this file from a client component. The service role key
// bypasses row level security, which is exactly what /api/upload needs
// in order to write rows and files on your behalf.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export const BUCKET = process.env.SUPABASE_BUCKET || "photos";
