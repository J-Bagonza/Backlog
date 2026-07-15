import "server-only";
import { Redis } from "@upstash/redis";

// Uses Upstash's REST API, so it works fine in serverless/edge functions
// (no persistent TCP connection needed). If the env vars aren't set, we
// fall back to `null` so the app still works without Redis - it'll just
// hit Supabase directly every time, same as before.
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export const PHOTOS_CACHE_KEY = "photos:list";
export const PHOTOS_CACHE_TTL_SECONDS = 30; // matches the page's ISR revalidate window