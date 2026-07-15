import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. " +
      "Supabase queries will fail until these are configured in your environment variables."
  );
}

// Falling back to a syntactically-valid placeholder URL means a missing env
// var fails clearly at query time (with the warning above already in the
// logs) instead of crashing the entire build when Next.js imports this
// module to collect page data.
const url = supabaseUrl || "https://placeholder.supabase.co";
const key = supabaseAnonKey || "placeholder-anon-key";

// Safe to use in client components: the anon key only has read access
// because of the row level security policy defined in supabase/schema.sql
export const supabase = createClient(url, key);