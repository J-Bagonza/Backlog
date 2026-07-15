import exifr from "exifr";

export type YearResult = {
  year: number;
  takenAt: Date | null;
  source: "exif" | "filename" | "manual" | "unknown";
};

const CURRENT_YEAR = new Date().getFullYear();
const EARLIEST_YEAR = 1975; // first consumer color cameras / early digital era cutoff

/**
 * Figures out the year a photo was taken, trying the most trustworthy
 * signal first:
 *   1. EXIF "DateTimeOriginal" embedded by the camera
 *   2. A 4-digit year found in the original filename (e.g. "2004_beach.jpg")
 *   3. A manual "year" field supplied with the upload batch
 *   4. "unknown" bucket, so nothing ever gets rejected
 */
export async function resolveYear(
  buffer: Buffer,
  originalFilename: string,
  manualYear: number | null
): Promise<YearResult> {
  try {
    const exifData = await exifr.parse(buffer, { pick: ["DateTimeOriginal", "CreateDate"] });
    const raw = exifData?.DateTimeOriginal || exifData?.CreateDate;
    if (raw) {
      const date = new Date(raw);
      const year = date.getFullYear();
      if (isPlausibleYear(year)) {
        return { year, takenAt: date, source: "exif" };
      }
    }
  } catch {
    // Not every file has readable EXIF (PNG, screenshots, stripped metadata) - that's fine.
  }

  const filenameMatch = originalFilename.match(/(19[7-9]\d|20[0-4]\d)/);
  if (filenameMatch) {
    const year = parseInt(filenameMatch[1], 10);
    if (isPlausibleYear(year)) {
      return { year, takenAt: null, source: "filename" };
    }
  }

  if (manualYear && isPlausibleYear(manualYear)) {
    return { year: manualYear, takenAt: null, source: "manual" };
  }

  return { year: 0, takenAt: null, source: "unknown" };
}

function isPlausibleYear(year: number) {
  return year >= EARLIEST_YEAR && year <= CURRENT_YEAR;
}
