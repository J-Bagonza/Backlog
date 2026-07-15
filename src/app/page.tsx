import { supabase } from "@/lib/supabase";

export const revalidate = 30;

type Photo = {
  id: string;
  public_url: string;
  year: number;
  taken_at: string | null;
  original_filename: string | null;
  source: string;
};

async function getPhotos(): Promise<Photo[]> {
  const { data, error } = await supabase
    .from("photos")
    .select("id, public_url, year, taken_at, original_filename, source")
    .order("year", { ascending: true })
    .order("taken_at", { ascending: true, nullsFirst: true });

  if (error) {
    console.error("Failed to load photos:", error.message);
    return [];
  }
  return data ?? [];
}

async function getHitCount(): Promise<number | null> {
  const { data, error } = await supabase.rpc("increment_hit_count");
  if (error) {
    console.error("Failed to increment hit counter:", error.message);
    return null;
  }
  return data as number;
}

function formatTimestamp(photo: Photo) {
  if (photo.taken_at) {
    const d = new Date(photo.taken_at);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}/${dd}/${d.getFullYear()}`;
  }
  return String(photo.year);
}

export default async function HomePage() {
  const [photos, hitCount] = await Promise.all([getPhotos(), getHitCount()]);

  const byYear = new Map<number, Photo[]>();
  for (const photo of photos) {
    const list = byYear.get(photo.year) ?? [];
    list.push(photo);
    byYear.set(photo.year, list);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => a - b);

  return (
    <div className="page-wrap">
      <div className="container">
        <h1 className="site-title">the photo box.</h1>
        <p className="site-tagline">
          {/* @ts-ignore -- marquee is an obsolete but still-rendered HTML element, used here on purpose */}
          <marquee scrollamount="3">a small archive of old pictures, kept exactly as they were.</marquee>
        </p>

        <div className="hitcounter-row">
          <span className="hitcounter">
            visitors: {hitCount !== null ? String(hitCount).padStart(6, "0") : "??????"}
          </span>
        </div>

        <hr className="divider" />

        {years.length > 0 && (
          <ul className="year-tabs">
            {years.map((year) => (
              <li key={year}>
                <a href={`#year-${year}`}>{year}</a>
              </li>
            ))}
          </ul>
        )}

        {years.length === 0 && (
          <p className="empty-state">
            nothing here yet — upload some photos and they'll show up, sorted by year, automatically.
          </p>
        )}

        {years.map((year) => (
          <section id={`year-${year}`} className="year-section" key={year}>
            <h2 className="year-heading">
              <span className="stars">✦ ✦ ✦</span>
              {year}
            </h2>
            <div className="photo-grid">
              {byYear.get(year)!.map((photo) => (
                <div className="photo-frame" key={photo.id}>
                  <img src={photo.public_url} alt={photo.original_filename ?? `photo from ${year}`} loading="lazy" />
                  <span className="timestamp">{formatTimestamp(photo)}</span>
                </div>
              ))}
            </div>
          </section>
        ))}

        <footer>
          <p>
            best viewed at 800×600 &middot; <span className="blink">★ under construction ★</span>
          </p>
          <p>this page does not use cookies, tracking pixels, or javascript frameworks you didn't ask for.</p>
        </footer>
      </div>
    </div>
  );
}
