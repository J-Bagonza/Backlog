import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { redis, PHOTOS_CACHE_KEY, PHOTOS_CACHE_TTL_SECONDS } from "@/lib/redis";

export const revalidate = 60;

export async function GET() {
  if (redis) {
    const cached = await redis.get(PHOTOS_CACHE_KEY);
    if (cached) return NextResponse.json({ photos: cached });
  }

  const { data, error } = await supabase
    .from("photos")
    .select("id, public_url, year, taken_at, original_filename, source")
    .order("year", { ascending: true })
    .order("taken_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (redis) {
    await redis.set(PHOTOS_CACHE_KEY, data, { ex: PHOTOS_CACHE_TTL_SECONDS });
  }

  return NextResponse.json({ photos: data });
}