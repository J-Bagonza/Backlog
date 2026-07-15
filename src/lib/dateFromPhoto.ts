export type YearSource = "exif" | "filename" | "manual" | "unknown";

export type YearResult = {
  year: number;
  takenAt: Date | null;
  source: YearSource;
};

export const CURRENT_YEAR = new Date().getFullYear();
export const EARLIEST_YEAR = 1975; // first consumer color cameras / early digital era cutoff

export function isPlausibleYear(year: number) {
  return Number.isFinite(year) && year >= EARLIEST_YEAR && year <= CURRENT_YEAR;
}

export function yearFromFilename(filename: string): number | null {
  const match = filename.match(/(19[7-9]\d|20[0-4]\d)/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  return isPlausibleYear(year) ? year : null;
}

/**
 * Given whatever signals are available (EXIF date already extracted by the
 * caller, the original filename, and an optional manual override), decides
 * which year a photo belongs to. Pure/environment-agnostic - safe to import
 * from both client components and server routes.
 */
export function resolveYearFromSignals(
  exifDate: Date | null,
  originalFilename: string,
  manualYear: number | null
): YearResult {
  if (exifDate && isPlausibleYear(exifDate.getFullYear())) {
    return { year: exifDate.getFullYear(), takenAt: exifDate, source: "exif" };
  }

  const filenameYear = yearFromFilename(originalFilename);
  if (filenameYear !== null) {
    return { year: filenameYear, takenAt: null, source: "filename" };
  }

  if (manualYear !== null && isPlausibleYear(manualYear)) {
    return { year: manualYear, takenAt: null, source: "manual" };
  }

  return { year: 0, takenAt: null, source: "unknown" };
}
