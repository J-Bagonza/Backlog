"use client";

import { useState } from "react";

export default function UploadPage() {
  const [secret, setSecret] = useState("");
  const [year, setYear] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function appendLog(line: string) {
    setLog((prev) => [...prev, line]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files || files.length === 0) {
      appendLog("> pick at least one file first.");
      return;
    }

    setBusy(true);
    appendLog(`> uploading ${files.length} file(s)...`);

    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));
    if (year.trim()) formData.append("year", year.trim());

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "x-upload-secret": secret },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        appendLog(`> error: ${data.error ?? res.statusText}`);
      } else {
        appendLog(`> done. uploaded ${data.uploaded}, failed ${data.failed}.`);
        for (const r of data.results) {
          if (r.ok) {
            appendLog(`  ok  ${r.filename} -> ${r.year} (${r.source})`);
          } else {
            appendLog(`  fail ${r.filename}: ${r.error}`);
          }
        }
      }
    } catch (err) {
      appendLog(`> network error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-wrap">
      <div className="upload-page">
        <h1>upload photos</h1>
        <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
          this page is just a thin wrapper around POST /api/upload. the site doesn't require
          you to use it — curl or Postman work fine too.
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
