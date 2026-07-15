import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Safe to use in client components: the anon key only has read access
// because of the row level security policy defined in supabase/schema.sql
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
