"use client";

import { useState } from "react";
import exifr from "exifr";
import { supabase } from "@/lib/supabase";
import { resolveYearFromSignals } from "@/lib/dateFromPhoto";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "photos";

export default function UploadPage() {
  const [secret, setSecret] = useState("");
  const [year, setYear] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function appendLog(line: string) {
    setLog((prev) => [...prev, line]);
  }

  async function extractExifDate(file: File): Promise<Date | null> {
    try {
      const data = await exifr.parse(file, { pick: ["DateTimeOriginal", "CreateDate"] });
      const raw = data?.DateTimeOriginal || data?.CreateDate;
      return raw ? new Date(raw) : null;
    } catch {
      return null; // plenty of files (PNGs, screenshots, stripped metadata) have none - that's fine
    }
  }

  async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
    try {
      const bitmap = await createImageBitmap(file);
      const dims = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dims;
    } catch {
      return null; // corrupt file, unsupported format, etc - upload still proceeds without dims
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files || files.length === 0) {
      appendLog("> pick at least one file first.");
      return;
    }

    setBusy(true);
    const fileList = Array.from(files);
    const manualYear = year.trim() ? parseInt(year.trim(), 10) : null;
    appendLog(`> reading dates for ${fileList.length} file(s)...`);

    //  Work out the year and pixel dimensions for each file locally
    //    (year: EXIF -> filename -> manual -> unknown; dims: read from the file itself)
    const resolved = await Promise.all(
      fileList.map(async (file) => {
        const exifDate = await extractExifDate(file);
        const result = resolveYearFromSignals(exifDate, file.name, manualYear);
        const dims = await getImageDimensions(file);
        return { file, ...result, width: dims?.width ?? null, height: dims?.height ?? null };
      })
    );

    // Ask the server for a signed upload URL per file (small JSON request, no file bytes)
    appendLog("> requesting upload slots...");
    let createRes: Response;
    try {
      createRes = await fetch("/api/upload/create-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-upload-secret": secret },
        body: JSON.stringify({
          files: resolved.map((r) => ({ filename: r.file.name, year: r.year })),
        }),
      });
    } catch (err) {
      appendLog(`> network error: ${(err as Error).message}`);
      setBusy(false);
      return;
    }

    const createData = await createRes.json().catch(() => null);
    if (!createRes.ok || !createData?.results) {
      appendLog(`> error: ${createData?.error ?? createRes.statusText}`);
      setBusy(false);
      return;
    }

    //  Upload each file's bytes straight to Supabase Storage, then finalize its DB row
    let ok = 0;
    let failed = 0;

    for (let i = 0; i < resolved.length; i++) {
      const { file, year: fileYear, takenAt, source, width, height } = resolved[i];
      const slot = createData.results[i];

      if (!slot?.ok) {
        appendLog(`  fail ${file.name}: ${slot?.error ?? "no upload slot"}`);
        failed++;
        continue;
      }

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(slot.path, slot.token, file);

      if (uploadError) {
        appendLog(`  fail ${file.name}: ${uploadError.message}`);
        failed++;
        continue;
      }

      const finalizeRes = await fetch("/api/upload/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-upload-secret": secret },
        body: JSON.stringify({
          path: slot.path,
          originalFilename: file.name,
          year: fileYear,
          takenAt,
          source,
          width,
          height,
        }),
      });

      if (!finalizeRes.ok) {
        const errData = await finalizeRes.json().catch(() => null);
        appendLog(`  fail ${file.name}: uploaded but not saved (${errData?.error ?? finalizeRes.statusText})`);
        failed++;
        continue;
      }

      appendLog(`  ok  ${file.name} -> ${fileYear === 0 ? "unknown" : fileYear} (${source})`);
      ok++;
    }

    appendLog(`> done. uploaded ${ok}, failed ${failed}.`);
    setBusy(false);
  }

  return (
    <div className="page-wrap">
      <div className="upload-page">
        <h1>upload photos</h1>
        <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
          files upload straight from your browser to storage, so batch size isn't limited by
          Vercel's request size cap.
        </p>

        <form onSubmit={handleSubmit}>
          <label>upload password</label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="UPLOAD_SECRET"
            required
          />

          <label>force year (optional — only if the photos have no EXIF date and no year in the filename)</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="e.g. 1998"
          />

          <label>photos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            style={{ marginBottom: 14 }}
            required
          />

          <button type="submit" disabled={busy}>
            {busy ? "uploading..." : "upload"}
          </button>
        </form>

        {log.length > 0 && (
          <div className="upload-log">
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}