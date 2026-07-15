"use client";

import { useEffect, useState } from "react";

export type Photo = {
  id: string;
  public_url: string;
  year: number;
  taken_at: string | null;
  original_filename: string | null;
  source: string;
};

function formatTimestamp(photo: Photo) {
  if (photo.taken_at) {
    const d = new Date(photo.taken_at);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}/${dd}/${d.getFullYear()}`;
  }
  return String(photo.year);
}

export default function Gallery({ photos }: { photos: Photo[] }) {
  const byYear = new Map<number, Photo[]>();
  for (const photo of photos) {
    const list = byYear.get(photo.year) ?? [];
    list.push(photo);
    byYear.set(photo.year, list);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => a - b);

  // Index into the flat `photos` array (display order), so prev/next in the
  // lightbox can flip across an entire year's edge into the next one.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex !== null;
  const current = openIndex !== null ? photos[openIndex] : null;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") setOpenIndex((i) => (i === null ? i : Math.min(i + 1, photos.length - 1)));
      if (e.key === "ArrowLeft") setOpenIndex((i) => (i === null ? i : Math.max(i - 1, 0)));
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, photos.length]);

  if (years.length === 0) {
    return (
      <p className="empty-state">
        nothing here yet — upload some photos and they'll show up, sorted by year, automatically.
      </p>
    );
  }

  return (
    <>
      <ul className="year-tabs">
        {years.map((year, i) => (
          <li key={year}>
            <a href={`#year-${year}`} className={`tab-color-${i % 4}`}>
              {year}
            </a>
          </li>
        ))}
      </ul>

      {years.map((year) => (
        <section id={`year-${year}`} className="year-section" key={year}>
          <h2 className="year-heading">
            <span className="stars">✦ ✦ ✦</span>
            {year}
          </h2>
          <div className="photo-grid">
            {byYear.get(year)!.map((photo) => {
              const flatIndex = photos.findIndex((p) => p.id === photo.id);
              return (
                <button
                  type="button"
                  className="photo-frame"
                  key={photo.id}
                  onClick={() => setOpenIndex(flatIndex)}
                  aria-label={`view ${photo.original_filename ?? "photo"} full size`}
                >
                  <img
                    src={photo.public_url}
                    alt={photo.original_filename ?? `photo from ${year}`}
                    loading="lazy"
                  />
                  <span className="timestamp">{formatTimestamp(photo)}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {open && current && (
        <div className="lightbox-backdrop" onClick={() => setOpenIndex(null)}>
          <div className="lightbox-shell" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setOpenIndex(null)}
              aria-label="close"
            >
              ✕
            </button>

            {openIndex! > 0 && (
              <button
                type="button"
                className="lightbox-nav lightbox-prev"
                onClick={() => setOpenIndex((i) => (i === null ? i : i - 1))}
                aria-label="previous photo"
              >
                ‹
              </button>
            )}
            {openIndex! < photos.length - 1 && (
              <button
                type="button"
                className="lightbox-nav lightbox-next"
                onClick={() => setOpenIndex((i) => (i === null ? i : i + 1))}
                aria-label="next photo"
              >
                ›
              </button>
            )}

            <img
              src={current.public_url}
              alt={current.original_filename ?? `photo from ${current.year}`}
              className="lightbox-image"
            />
            <div className="lightbox-caption">
              <span className="timestamp">{formatTimestamp(current)}</span>
              {current.original_filename && <span>{current.original_filename}</span>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}