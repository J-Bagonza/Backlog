import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

export async function GET() {
  const { data, error } = await supabase
    .from("photos")
    .select("id, public_url, year, taken_at, original_filename, source")
    .order("year", { ascending: true })
    .order("taken_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ photos: data });
}
