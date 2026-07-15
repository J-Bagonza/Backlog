# the photo box.

A small nostalgic photo archive. Upload old photos (from a ~1980-onwards color-camera era
up through today), and the site automatically sorts them into year sections and displays
them in a deliberately old-web style — tiled background, beveled photo frames, and an
orange digital-camera timestamp burned into the corner of each photo.

There are exactly two things this app does:
1. **Display** photos, grouped by year, on the homepage (`/`).
2. **Accept uploads** via a protected API endpoint (`/api/upload`), including mass upload.

No accounts, no comments, no likes. Just the pictures.

---

## 1. How photos get sorted into years

For every uploaded file, in order of trust:
1. **EXIF `DateTimeOriginal`** — the date the camera itself stamped on the photo. Most
   digital camera/phone photos from 2004+ have this.
2. **A 4-digit year in the filename** — e.g. `1998_family_trip.jpg` → 1998.
3. **A manual `year` field** you set for the whole upload batch — handy for scanned prints
   with no EXIF data at all (e.g. dumping a whole 1985 photo album in one go).
4. Otherwise the photo lands in an "unknown" storage folder but is still shown, filed
   under the current year, so nothing silently disappears.

---

## 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project (free tier is fine).
2. **Create the storage bucket:** Storage → New bucket → name it `photos` → make it a
   **public** bucket (so images can be displayed directly without signed URLs).
3. **Create the database table:** SQL Editor → New query → paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql) → Run.
4. **Grab your API keys:** Project Settings → API.
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this one secret — it's only
     ever used server-side, in `/api/upload`)

---

## 3. Run it locally (Windows + VS Code)

You'll need [Node.js](https://nodejs.org) (LTS) installed.

Open this folder in VS Code, then in the built-in terminal (`` Ctrl+` ``):

```powershell
npm install
copy .env.example .env.local
```

Open `.env.local` and fill in the four values from Supabase, plus pick your own
`UPLOAD_SECRET` (any long random string — this is the password that protects your
upload endpoint from strangers on the internet).

Then:

```powershell
npm run dev
```

Visit `http://localhost:3000` for the gallery, and `http://localhost:3000/upload` for
the upload page.

---

## 4. Uploading photos

**Option A — the built-in upload page (easiest):**
Go to `/upload`, enter your `UPLOAD_SECRET`, pick one or many files, and submit. Good for
mass-uploading a whole folder at once (select multiple files in the file picker).

**Option B — curl, for scripting a big backlog:**

```powershell
curl -X POST http://localhost:3000/api/upload ^
  -H "x-upload-secret: YOUR_UPLOAD_SECRET" ^
  -F "files=@C:\path\to\photo1.jpg" ^
  -F "files=@C:\path\to\photo2.jpg"
```

Add `-F "year=1998"` to force every file in that request into one year (useful for
scanned prints without EXIF data).

If you delete `src/app/upload`, the site still works exactly the same — the endpoint
doesn't depend on that page at all.

---

## 5. Deploy to Vercel

1. Push this project to a GitHub repo.
2. In [vercel.com](https://vercel.com), "Add New Project" → import the repo.
3. Under **Environment Variables**, add the same five values from your `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`, `UPLOAD_SECRET`).
4. Deploy. Vercel auto-detects Next.js, no config needed.

## 6. Custom domain (Namecheap)

Once you buy a domain on Namecheap:
1. In Vercel: Project → Settings → Domains → add your domain.
2. Vercel will show you either an A record + CNAME, or nameservers to use.
3. In Namecheap: Domain List → Manage → Advanced DNS → add the records Vercel gave you
   (or point nameservers at Vercel's, whichever option Vercel's UI recommends).
4. DNS propagation usually takes anywhere from a few minutes to a few hours.

---

## Project structure

```
src/
  app/
    page.tsx              the gallery homepage (server component)
    upload/page.tsx        optional convenience UI for uploading (deletable)
    api/upload/route.ts    POST endpoint — protected by UPLOAD_SECRET
    api/photos/route.ts    GET endpoint — returns all photos as JSON
    globals.css             all the visual styling lives here
  lib/
    supabase.ts             read-only client (safe for the browser)
    supabaseAdmin.ts        service-role client (server-only, used for writes)
    dateFromPhoto.ts        the EXIF / filename / manual year-resolution logic
supabase/
  schema.sql                run once in the Supabase SQL editor
```

## Notes / things you may want to tweak

- Currently any image type in `ALLOWED_TYPES` (`src/app/api/upload/route.ts`) up to
  Vercel's request size limits is accepted. If you're uploading very large scanned TIFFs,
  you may want to compress before upload.
- The homepage sorts years oldest → newest (like flipping forward through a photo box).
  Swap the `sort` direction in `src/app/page.tsx` if you'd rather have newest first.
- The "visitor #" counter increments on every homepage load (including your own refreshes)
  — it's flavor, not real analytics.
