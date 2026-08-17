import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";

import { getDb } from "../db";
import { instagramStoryQueue } from "../db/schema";
import { getRuntimeEnv } from "./runtime-env";

const DEFAULT_MIN_PRICE_TOMAN = 3_000_000_000;
const DEFAULT_DAILY_CAPACITY = 20;
const DEFAULT_MIN_INTERVAL_MINUTES = 30;
const DEFAULT_MAX_ATTEMPTS = 5;
const PUBLISHING_STALE_MINUTES = 10;
const ACTIVE_SLOT_STATUSES = ["queued", "publishing", "published", "failed"];

type QueueStatus =
  | "queued"
  | "publishing"
  | "published"
  | "failed"
  | "expired"
  | "ineligible"
  | "capacity_full";

type InstagramCandidateInput = {
  storyOrderId: number;
  ownerKey: string;
  listingId: number;
  priceToman: number;
  title: string;
  imageUrl: string;
  publicUrl: string;
  sourceExpiresAt: string;
};

type GraphResponse = {
  id?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

function readServerSetting(name: string) {
  try {
    const runtime = getRuntimeEnv() as unknown as Record<string, unknown>;
    const value = runtime[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  } catch {
    // Portable/VPS runtime may not use the Cloudflare AsyncLocalStorage wrapper.
  }

  if (typeof process !== "undefined") {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function integerSetting(name: string, fallback: number, min: number, max: number) {
  const value = Number(readServerSetting(name));
  if (!Number.isSafeInteger(value) || value < min || value > max) return fallback;
  return value;
}

function booleanSetting(name: string, fallback = false) {
  const value = readServerSetting(name).toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "on", "enabled"].includes(value);
}

export function getInstagramPublishingConfig() {
  const config = {
    enabled: booleanSetting("INSTAGRAM_PUBLISH_ENABLED", false),
    graphApiVersion: readServerSetting("INSTAGRAM_GRAPH_API_VERSION"),
    businessAccountId: readServerSetting("INSTAGRAM_BUSINESS_ACCOUNT_ID"),
    accessToken: readServerSetting("INSTAGRAM_ACCESS_TOKEN"),
    publisherSecret: readServerSetting("INSTAGRAM_PUBLISHER_SECRET"),
    minPriceToman: integerSetting(
      "INSTAGRAM_STORY_MIN_PRICE_TOMAN",
      DEFAULT_MIN_PRICE_TOMAN,
      100_000_000,
      100_000_000_000,
    ),
    dailyCapacity: integerSetting("INSTAGRAM_STORY_DAILY_CAPACITY", DEFAULT_DAILY_CAPACITY, 1, 100),
    minIntervalMinutes: integerSetting(
      "INSTAGRAM_STORY_MIN_INTERVAL_MINUTES",
      DEFAULT_MIN_INTERVAL_MINUTES,
      1,
      24 * 60,
    ),
    maxAttempts: integerSetting("INSTAGRAM_STORY_MAX_ATTEMPTS", DEFAULT_MAX_ATTEMPTS, 1, 20),
  };

  return {
    ...config,
    ready: Boolean(
      config.enabled
      && config.graphApiVersion
      && config.businessAccountId
      && config.accessToken
      && config.publisherSecret
    ),
  };
}

export function publicInstagramPublishingConfig() {
  const config = getInstagramPublishingConfig();
  return {
    enabled: config.enabled,
    ready: config.ready,
    min_price_toman: config.minPriceToman,
    daily_capacity: config.dailyCapacity,
    min_interval_minutes: config.minIntervalMinutes,
  };
}

export function instagramStoryEligibility(priceToman: number, imageUrl: string) {
  const config = getInstagramPublishingConfig();
  const normalizedPrice = Number.isFinite(priceToman) ? Math.max(0, Math.round(priceToman)) : 0;
  const hasImage = Boolean(imageUrl.trim());
  const priceEligible = normalizedPrice >= config.minPriceToman;

  return {
    eligible: priceEligible && hasImage,
    price_eligible: priceEligible,
    has_image: hasImage,
    price_toman: normalizedPrice,
    min_price_toman: config.minPriceToman,
    reason: !priceEligible ? "price_below_threshold" : !hasImage ? "missing_public_image" : "eligible",
  };
}

export function tehranDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function currentSlotRows(slotDate: string) {
  const db = getDb();
  return db
    .select({
      id: instagramStoryQueue.id,
      slotNumber: instagramStoryQueue.slotNumber,
      status: instagramStoryQueue.status,
    })
    .from(instagramStoryQueue)
    .where(eq(instagramStoryQueue.slotDate, slotDate))
    .limit(200);
}

async function nextAvailableSlot(slotDate: string, capacity: number) {
  const rows = await currentSlotRows(slotDate);
  const occupied = new Set(
    rows
      .filter((row) => row.slotNumber > 0 && ACTIVE_SLOT_STATUSES.includes(row.status))
      .map((row) => row.slotNumber),
  );

  for (let slot = 1; slot <= capacity; slot += 1) {
    if (!occupied.has(slot)) return slot;
  }
  return 0;
}

export async function getInstagramStoryCapacitySnapshot(date = new Date()) {
  const config = getInstagramPublishingConfig();
  const slotDate = tehranDateKey(date);
  const rows = await currentSlotRows(slotDate);
  const reserved = rows.filter(
    (row) => row.slotNumber > 0 && ACTIVE_SLOT_STATUSES.includes(row.status),
  ).length;

  return {
    slot_date: slotDate,
    daily_capacity: config.dailyCapacity,
    reserved,
    remaining: Math.max(0, config.dailyCapacity - reserved),
  };
}

async function updateCandidateSnapshot(id: number, input: InstagramCandidateInput, nowIso: string) {
  const db = getDb();
  await db
    .update(instagramStoryQueue)
    .set({
      ownerKey: input.ownerKey,
      listingId: input.listingId,
      priceToman: input.priceToman,
      title: input.title,
      imageUrl: input.imageUrl,
      publicUrl: input.publicUrl,
      sourceExpiresAt: input.sourceExpiresAt,
      updatedAt: nowIso,
    })
    .where(eq(instagramStoryQueue.id, id));
}

export async function syncInstagramStoryCandidate(input: InstagramCandidateInput) {
  const db = getDb();
  const config = getInstagramPublishingConfig();
  const eligibility = instagramStoryEligibility(input.priceToman, input.imageUrl);
  const now = new Date();
  const nowIso = now.toISOString();
  const slotDate = tehranDateKey(now);
  const [existing] = await db
    .select()
    .from(instagramStoryQueue)
    .where(eq(instagramStoryQueue.storyOrderId, input.storyOrderId))
    .limit(1);

  if (!eligibility.eligible) {
    if (existing && existing.status !== "published") {
      await db
        .update(instagramStoryQueue)
        .set({
          ownerKey: input.ownerKey,
          listingId: input.listingId,
          priceToman: input.priceToman,
          minPriceToman: config.minPriceToman,
          title: input.title,
          imageUrl: input.imageUrl,
          publicUrl: input.publicUrl,
          sourceExpiresAt: input.sourceExpiresAt,
          status: "ineligible",
          slotNumber: 0,
          lastError: eligibility.reason,
          updatedAt: nowIso,
        })
        .where(eq(instagramStoryQueue.id, existing.id));
    }

    return {
      ...eligibility,
      queue_status: existing?.status === "published" ? "published" : "ineligible",
      slot_date: existing?.slotDate || "",
      slot_number: existing?.slotNumber || 0,
      capacity: await getInstagramStoryCapacitySnapshot(now),
    };
  }

  if (existing?.status === "published" || existing?.status === "publishing") {
    await updateCandidateSnapshot(existing.id, input, nowIso);
    return {
      ...eligibility,
      queue_status: existing.status,
      slot_date: existing.slotDate,
      slot_number: existing.slotNumber,
      capacity: await getInstagramStoryCapacitySnapshot(now),
    };
  }

  if (existing?.status === "queued" && existing.slotDate === slotDate && existing.slotNumber > 0) {
    await updateCandidateSnapshot(existing.id, input, nowIso);
    return {
      ...eligibility,
      queue_status: "queued",
      slot_date: existing.slotDate,
      slot_number: existing.slotNumber,
      capacity: await getInstagramStoryCapacitySnapshot(now),
    };
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slotNumber = await nextAvailableSlot(slotDate, config.dailyCapacity);
    if (!slotNumber) {
      if (existing) {
        await db
          .update(instagramStoryQueue)
          .set({
            ownerKey: input.ownerKey,
            listingId: input.listingId,
            priceToman: input.priceToman,
            minPriceToman: config.minPriceToman,
            title: input.title,
            imageUrl: input.imageUrl,
            publicUrl: input.publicUrl,
            sourceExpiresAt: input.sourceExpiresAt,
            slotDate,
            slotNumber: 0,
            status: "capacity_full",
            attempts: 0,
            lastError: "daily_capacity_full",
            updatedAt: nowIso,
          })
          .where(eq(instagramStoryQueue.id, existing.id));
      } else {
        await db.insert(instagramStoryQueue).values({
          storyOrderId: input.storyOrderId,
          ownerKey: input.ownerKey,
          listingId: input.listingId,
          priceToman: input.priceToman,
          minPriceToman: config.minPriceToman,
          title: input.title,
          imageUrl: input.imageUrl,
          publicUrl: input.publicUrl,
          sourceExpiresAt: input.sourceExpiresAt,
          slotDate,
          slotNumber: 0,
          status: "capacity_full",
          priority: 100,
          updatedAt: nowIso,
        });
      }

      return {
        ...eligibility,
        queue_status: "capacity_full" as QueueStatus,
        slot_date: slotDate,
        slot_number: 0,
        capacity: await getInstagramStoryCapacitySnapshot(now),
      };
    }

    try {
      if (existing) {
        await db
          .update(instagramStoryQueue)
          .set({
            ownerKey: input.ownerKey,
            listingId: input.listingId,
            priceToman: input.priceToman,
            minPriceToman: config.minPriceToman,
            title: input.title,
            imageUrl: input.imageUrl,
            publicUrl: input.publicUrl,
            sourceExpiresAt: input.sourceExpiresAt,
            slotDate,
            slotNumber,
            status: "queued",
            priority: 100,
            attempts: 0,
            lastError: "",
            metaContainerId: "",
            updatedAt: nowIso,
          })
          .where(eq(instagramStoryQueue.id, existing.id));
      } else {
        await db.insert(instagramStoryQueue).values({
          storyOrderId: input.storyOrderId,
          ownerKey: input.ownerKey,
          listingId: input.listingId,
          priceToman: input.priceToman,
          minPriceToman: config.minPriceToman,
          title: input.title,
          imageUrl: input.imageUrl,
          publicUrl: input.publicUrl,
          sourceExpiresAt: input.sourceExpiresAt,
          slotDate,
          slotNumber,
          status: "queued",
          priority: 100,
          updatedAt: nowIso,
        });
      }

      return {
        ...eligibility,
        queue_status: "queued" as QueueStatus,
        slot_date: slotDate,
        slot_number: slotNumber,
        capacity: await getInstagramStoryCapacitySnapshot(now),
      };
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }

  throw new Error("Instagram story slot could not be reserved.");
}

function cleanGraphError(payload: GraphResponse | null, fallback: string) {
  const message = payload?.error?.message || fallback;
  return String(message).replace(/\s+/g, " ").trim().slice(0, 500);
}

async function graphPost(
  path: string,
  params: Record<string, string>,
  config: ReturnType<typeof getInstagramPublishingConfig>,
) {
  const url = `https://graph.facebook.com/${encodeURIComponent(config.graphApiVersion)}/${path}`;
  const body = new URLSearchParams({ ...params, access_token: config.accessToken });
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(25_000),
  });
  const payload = (await response.json().catch(() => null)) as GraphResponse | null;
  if (!response.ok || !payload?.id) {
    throw new Error(cleanGraphError(payload, `Meta Graph API request failed with ${response.status}.`));
  }
  return payload.id;
}

export async function processNextInstagramStory() {
  const config = getInstagramPublishingConfig();
  if (!config.ready) {
    return {
      success: false,
      processed: false,
      code: "not_configured",
      message: "Instagram publisher is not fully configured.",
      config: publicInstagramPublishingConfig(),
    };
  }

  const db = getDb();
  const now = new Date();
  const nowIso = now.toISOString();
  const today = tehranDateKey(now);
  const staleIso = new Date(now.getTime() - PUBLISHING_STALE_MINUTES * 60_000).toISOString();

  await db
    .update(instagramStoryQueue)
    .set({ status: "queued", updatedAt: nowIso })
    .where(
      and(
        eq(instagramStoryQueue.status, "publishing"),
        lte(instagramStoryQueue.updatedAt, staleIso),
      ),
    );

  await db
    .update(instagramStoryQueue)
    .set({
      status: "expired",
      slotNumber: 0,
      lastError: "source_story_expired",
      updatedAt: nowIso,
    })
    .where(
      and(
        inArray(instagramStoryQueue.status, ["queued", "failed", "capacity_full"]),
        lte(instagramStoryQueue.sourceExpiresAt, nowIso),
      ),
    );

  const publishedToday = await db
    .select({ id: instagramStoryQueue.id })
    .from(instagramStoryQueue)
    .where(
      and(
        eq(instagramStoryQueue.status, "published"),
        eq(instagramStoryQueue.publishedDate, today),
      ),
    )
    .limit(config.dailyCapacity + 1);

  if (publishedToday.length >= config.dailyCapacity) {
    return {
      success: true,
      processed: false,
      code: "daily_capacity_reached",
      published_today: publishedToday.length,
      daily_capacity: config.dailyCapacity,
    };
  }

  const [lastPublished] = await db
    .select({ publishedAt: instagramStoryQueue.publishedAt })
    .from(instagramStoryQueue)
    .where(eq(instagramStoryQueue.status, "published"))
    .orderBy(desc(instagramStoryQueue.publishedAt))
    .limit(1);

  if (lastPublished?.publishedAt) {
    const lastTime = new Date(lastPublished.publishedAt).getTime();
    const nextAllowedAt = lastTime + config.minIntervalMinutes * 60_000;
    if (Number.isFinite(lastTime) && nextAllowedAt > now.getTime()) {
      return {
        success: true,
        processed: false,
        code: "rate_paced",
        next_allowed_at: new Date(nextAllowedAt).toISOString(),
      };
    }
  }

  const [candidate] = await db
    .select()
    .from(instagramStoryQueue)
    .where(
      and(
        eq(instagramStoryQueue.status, "queued"),
        lte(instagramStoryQueue.slotDate, today),
      ),
    )
    .orderBy(
      asc(instagramStoryQueue.slotDate),
      asc(instagramStoryQueue.slotNumber),
      asc(instagramStoryQueue.id),
    )
    .limit(1);

  if (!candidate) {
    return { success: true, processed: false, code: "queue_empty" };
  }

  if (candidate.sourceExpiresAt <= nowIso) {
    await db
      .update(instagramStoryQueue)
      .set({
        status: "expired",
        slotNumber: 0,
        lastError: "source_story_expired",
        updatedAt: nowIso,
      })
      .where(eq(instagramStoryQueue.id, candidate.id));
    return { success: true, processed: false, code: "expired_candidate", queue_id: candidate.id };
  }

  const attempts = candidate.attempts + 1;
  await db
    .update(instagramStoryQueue)
    .set({
      status: "publishing",
      attempts,
      lastError: "",
      updatedAt: nowIso,
    })
    .where(eq(instagramStoryQueue.id, candidate.id));

  try {
    let containerId = candidate.metaContainerId;
    if (!containerId) {
      containerId = await graphPost(
        `${encodeURIComponent(config.businessAccountId)}/media`,
        {
          image_url: candidate.imageUrl,
          media_type: "STORIES",
        },
        config,
      );
      await db
        .update(instagramStoryQueue)
        .set({ metaContainerId: containerId, updatedAt: new Date().toISOString() })
        .where(eq(instagramStoryQueue.id, candidate.id));
    }

    const mediaId = await graphPost(
      `${encodeURIComponent(config.businessAccountId)}/media_publish`,
      { creation_id: containerId },
      config,
    );
    const publishedAt = new Date().toISOString();

    await db
      .update(instagramStoryQueue)
      .set({
        status: "published",
        metaMediaId: mediaId,
        publishedDate: tehranDateKey(new Date(publishedAt)),
        publishedAt,
        lastError: "",
        updatedAt: publishedAt,
      })
      .where(eq(instagramStoryQueue.id, candidate.id));

    return {
      success: true,
      processed: true,
      code: "published",
      queue_id: candidate.id,
      story_order_id: candidate.storyOrderId,
      listing_id: candidate.listingId,
      meta_media_id: mediaId,
      published_at: publishedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Instagram publication failed.";
    const permanentlyFailed = attempts >= config.maxAttempts;
    await db
      .update(instagramStoryQueue)
      .set({
        status: permanentlyFailed ? "failed" : "queued",
        slotNumber: permanentlyFailed ? 0 : candidate.slotNumber,
        lastError: message,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(instagramStoryQueue.id, candidate.id));

    return {
      success: false,
      processed: true,
      code: permanentlyFailed ? "failed_permanently" : "retry_scheduled",
      queue_id: candidate.id,
      attempts,
      max_attempts: config.maxAttempts,
      message,
    };
  }
}

export async function getInstagramQueueForOwner(ownerKey: string, listingId?: number) {
  const db = getDb();
  const filters = [eq(instagramStoryQueue.ownerKey, ownerKey)];
  if (listingId && Number.isSafeInteger(listingId) && listingId > 0) {
    filters.push(eq(instagramStoryQueue.listingId, listingId));
  }

  return db
    .select({
      id: instagramStoryQueue.id,
      storyOrderId: instagramStoryQueue.storyOrderId,
      listingId: instagramStoryQueue.listingId,
      priceToman: instagramStoryQueue.priceToman,
      minPriceToman: instagramStoryQueue.minPriceToman,
      title: instagramStoryQueue.title,
      status: instagramStoryQueue.status,
      slotDate: instagramStoryQueue.slotDate,
      slotNumber: instagramStoryQueue.slotNumber,
      attempts: instagramStoryQueue.attempts,
      lastError: instagramStoryQueue.lastError,
      publishedAt: instagramStoryQueue.publishedAt,
      sourceExpiresAt: instagramStoryQueue.sourceExpiresAt,
    })
    .from(instagramStoryQueue)
    .where(and(...filters))
    .orderBy(desc(instagramStoryQueue.id))
    .limit(50);
}
