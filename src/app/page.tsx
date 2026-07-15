import { supabase } from "@/lib/supabase";
import Gallery, { Photo } from "@/components/Gallery";

export const revalidate = 30;

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

export default async function HomePage() {
  const [photos, hitCount] = await Promise.all([getPhotos(), getHitCount()]);

  return (
    <>
      <div className="topbar">
        <h1 className="site-title">BackRoll.</h1>
        <p className="site-tagline">
          {/* @ts-ignore -- marquee is an obsolete but still-rendered HTML element, used here on purpose */}
          <marquee scrollamount="3">tap any photo to view it full size. use the arrow keys to flip through.</marquee>
        </p>
      </div>

      <div className="page-content">
        <div className="hitcounter-row">
          <span className="hitcounter">
            visitors: {hitCount !== null ? String(hitCount).padStart(6, "0") : "??????"}
          </span>
        </div>

        <Gallery photos={photos} />

        <footer>
          <p>
            best viewed at 800×600 &middot; <span className="blink">★ under construction ★</span>
          </p>
          <p>this page does not use cookies, tracking pixels, or javascript frameworks you didn't ask for.</p>
        </footer>
      </div>
    </>
  );
}