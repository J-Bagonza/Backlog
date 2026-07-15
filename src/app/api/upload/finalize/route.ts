import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, BUCKET } from "@/lib/supabaseAdmin";
import { isPlausibleYear, YearSource } from "@/lib/dateFromPhoto";
import { redis, PHOTOS_CACHE_KEY } from "@/lib/redis";

export const runtime = "nodejs";

function isPlausibleDimension(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0 && n < 20000;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-upload-secret");
  if (!secret || secret !== process.env.UPLOAD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { path, originalFilename, year, takenAt, source, width, height } = body ?? {};

  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Missing 'path'" }, { status: 400 });
  }

  const safeYear = isPlausibleYear(year) ? year : new Date().getFullYear();
  const safeSource: YearSource = ["exif", "filename", "manual", "unknown"].includes(source)
    ? source
    : "unknown";
  const safeWidth = isPlausibleDimension(width) ? width : null;
  const safeHeight = isPlausibleDimension(height) ? height : null;

  const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

  const { error } = await supabaseAdmin.from("photos").insert({
    storage_path: path,
    public_url: publicUrlData.publicUrl,
    original_filename: originalFilename ?? null,
    year: safeYear,
    taken_at: takenAt ?? null,
    source: safeSource,
    width: safeWidth,
    height: safeHeight,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (redis) {
    try {
      await redis.del(PHOTOS_CACHE_KEY);
    } catch (err) {
      console.warn("Redis cache invalidation failed (check that UPSTASH_REDIS_REST_TOKEN is the read-write token):", (err as Error).message);
    }
  }

  return NextResponse.json({ ok: true, public_url: publicUrlData.publicUrl, year: safeYear });
}