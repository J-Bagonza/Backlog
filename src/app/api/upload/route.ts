import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin, BUCKET } from "@/lib/supabaseAdmin";
import { resolveYear } from "@/lib/dateFromPhoto";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"]);

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-upload-secret");
  if (!secret || secret !== process.env.UPLOAD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files found under the 'files' field" }, { status: 400 });
  }

  // Optional: force every file in this batch into one year, e.g. when scanning
  // a physical photo album from a specific year with no EXIF data at all.
  const manualYearRaw = form.get("year");
  const manualYear = manualYearRaw ? parseInt(manualYearRaw.toString(), 10) : null;

  const results = await Promise.all(
    files.map((file) => uploadOne(file, manualYear))
  );

  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({
    uploaded: succeeded.length,
    failed: failed.length,
    results,
  });
}

async function uploadOne(file: File, manualYear: number | null) {
  try {
    if (!ALLOWED_TYPES.has(file.type)) {
      return { ok: false, filename: file.name, error: `Unsupported type: ${file.type}` };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { year, takenAt, source } = await resolveYear(buffer, file.name, manualYear);
    const yearFolder = year === 0 ? "unknown" : String(year);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const storagePath = `${yearFolder}/${uuidv4()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return { ok: false, filename: file.name, error: uploadError.message };
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);

    const { error: dbError } = await supabaseAdmin.from("photos").insert({
      storage_path: storagePath,
      public_url: publicUrlData.publicUrl,
      original_filename: file.name,
      year: year === 0 ? new Date().getFullYear() : year, // fallback bucket, still shows up
      taken_at: takenAt,
      source,
    });

    if (dbError) {
      return { ok: false, filename: file.name, error: dbError.message };
    }

    return { ok: true, filename: file.name, year, source };
  } catch (err) {
    return { ok: false, filename: file.name, error: (err as Error).message };
  }
}
