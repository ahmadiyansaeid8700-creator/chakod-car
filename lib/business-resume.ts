import { getRuntimeEnv } from "./runtime-env";

export type BusinessResumeGalleryItem = {
  id: string;
  url: string;
  title: string;
  caption: string;
};

export type BusinessResume = {
  activity_id: number;
  headline: string;
  about: string;
  specialties: string[];
  gallery: BusinessResumeGalleryItem[];
  published: boolean;
  updated_at: string;
};

type ResumeRow = {
  activity_id?: number;
  headline?: string;
  about?: string;
  specialties_json?: string;
  gallery_json?: string;
  published?: number;
  updated_at?: string;
};

let schemaReady: Promise<void> | null = null;

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseJsonArray(value: unknown): unknown[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeMediaUrl(value: unknown) {
  const raw = clean(value, 1200);
  if (!raw) return "";
  if (raw.startsWith("/")) return raw;
  if (!/^https?:\/\//i.test(raw)) return "";
  return raw
    .replace(/^http:\/\/api\.chakod\.com\//i, "https://api.chakod.com/")
    .replace(/^https:\/\/api\.chakod\.com\/uploads\//i, "https://chakod.com/uploads/");
}

export function normalizeBusinessResumeInput(value: unknown) {
  const input = isRecord(value) ? value : {};
  const rawSpecialties = Array.isArray(input.specialties) ? input.specialties : [];
  const specialties = rawSpecialties
    .map((item) => clean(item, 70))
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 12);

  const rawGallery = Array.isArray(input.gallery) ? input.gallery : [];
  const gallery: BusinessResumeGalleryItem[] = [];
  const usedIds = new Set<string>();

  for (let index = 0; index < rawGallery.length && gallery.length < 12; index += 1) {
    const item = rawGallery[index];
    if (!isRecord(item)) continue;
    const url = normalizeMediaUrl(item.url);
    if (!url) continue;
    let id = clean(item.id, 90) || `image-${index + 1}`;
    if (usedIds.has(id)) id = `${id}-${index + 1}`;
    usedIds.add(id);
    gallery.push({
      id,
      url,
      title: clean(item.title, 100),
      caption: clean(item.caption, 260),
    });
  }

  return {
    headline: clean(input.headline, 160),
    about: clean(input.about, 1600),
    specialties,
    gallery,
    published: input.published !== false,
  };
}

export async function ensureBusinessResumeSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const d1 = getRuntimeEnv().DB;
      await d1.prepare(`CREATE TABLE IF NOT EXISTS business_activity_resumes (
        activity_id integer PRIMARY KEY NOT NULL,
        owner_user_id integer NOT NULL,
        headline text DEFAULT '' NOT NULL,
        about text DEFAULT '' NOT NULL,
        specialties_json text DEFAULT '[]' NOT NULL,
        gallery_json text DEFAULT '[]' NOT NULL,
        published integer DEFAULT 1 NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`).run();
      await d1
        .prepare("CREATE INDEX IF NOT EXISTS business_activity_resumes_owner_idx ON business_activity_resumes (owner_user_id)")
        .run();
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

export async function readBusinessResume(activityId: number): Promise<BusinessResume | null> {
  await ensureBusinessResumeSchema();
  const result = await getRuntimeEnv().DB
    .prepare("SELECT activity_id, headline, about, specialties_json, gallery_json, published, updated_at FROM business_activity_resumes WHERE activity_id = ? LIMIT 1")
    .bind(activityId)
    .all();
  const row = (result.results?.[0] || null) as ResumeRow | null;
  if (!row) return null;

  const specialties = parseJsonArray(row.specialties_json)
    .map((item) => clean(item, 70))
    .filter(Boolean)
    .slice(0, 12);
  const gallery = normalizeBusinessResumeInput({ gallery: parseJsonArray(row.gallery_json) }).gallery;

  return {
    activity_id: activityId,
    headline: clean(row.headline, 160),
    about: clean(row.about, 1600),
    specialties,
    gallery,
    published: Number(row.published ?? 1) !== 0,
    updated_at: clean(row.updated_at, 80),
  };
}

export async function saveBusinessResume(activityId: number, ownerUserId: number, value: unknown) {
  await ensureBusinessResumeSchema();
  const resume = normalizeBusinessResumeInput(value);
  await getRuntimeEnv().DB
    .prepare(`INSERT INTO business_activity_resumes (
      activity_id, owner_user_id, headline, about, specialties_json, gallery_json, published, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(activity_id) DO UPDATE SET
      owner_user_id = excluded.owner_user_id,
      headline = excluded.headline,
      about = excluded.about,
      specialties_json = excluded.specialties_json,
      gallery_json = excluded.gallery_json,
      published = excluded.published,
      updated_at = CURRENT_TIMESTAMP`)
    .bind(
      activityId,
      ownerUserId,
      resume.headline,
      resume.about,
      JSON.stringify(resume.specialties),
      JSON.stringify(resume.gallery),
      resume.published ? 1 : 0,
    )
    .run();

  return readBusinessResume(activityId);
}
