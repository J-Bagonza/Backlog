import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin, BUCKET } from "@/lib/supabaseAdmin";
import { isPlausibleYear } from "@/lib/dateFromPhoto";

export const runtime = "nodejs";

type RequestedFile = {
  filename: string;
  year: number; // already resolved client-side (exif -> filename -> manual -> unknown)
};

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-upload-secret");
  if (!secret || secret !== process.env.UPLOAD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const files: RequestedFile[] | undefined = body?.files;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "Expected a non-empty 'files' array" }, { status: 400 });
  }
  if (files.length > 100) {
    return NextResponse.json({ error: "Max 100 files per batch" }, { status: 400 });
  }

  const results = await Promise.all(
    files.map(async (f) => {
      const year = isPlausibleYear(f.year) ? f.year : 0;
      const yearFolder = year === 0 ? "unknown" : String(year);
      const ext = (f.filename.split(".").pop() || "jpg").toLowerCase().slice(0, 8);
      const path = `${yearFolder}/${uuidv4()}.${ext}`;

      const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);

      if (error || !data) {
        return { filename: f.filename, ok: false as const, error: error?.message ?? "Could not create signed URL" };
      }

      return {
        filename: f.filename,
        ok: true as const,
        path: data.path,
        token: data.token,
        signedUrl: data.signedUrl,
      };
    })
  );

  return NextResponse.json({ results });
}
