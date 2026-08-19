import { NextResponse } from "next/server";

import type { ListingModerationInput } from "@/lib/ai-moderation/contracts";
import {
  AiModerationError,
  moderateListing,
  verifyWebhookSecret,
} from "@/lib/ai-moderation/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 80_000;
const DEFAULT_IMAGE_HOSTS = [
  "api.chakod.com",
  "chakod.com",
  "www.chakod.com",
];

export async function POST(request: Request) {
  try {
    if (!verifyWebhookSecret(request.headers.get("authorization"))) {
      return NextResponse.json(
        { success: false, message: "دسترسی سرویس تأیید نشد." },
        { status: 401 },
      );
    }

    const contentLength = Number(request.headers.get("content-length") || 0);

    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { success: false, message: "حجم درخواست بیش از حد مجاز است." },
        { status: 413 },
      );
    }

    const payload: unknown = await request.json();
    const listing = parseListingInput(payload);
    const result = await moderateListing(listing);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof AiModerationError ? error.status : 400;
    const message =
      error instanceof Error
        ? error.message
        : "درخواست بررسی هوشمند معتبر نیست.";

    return NextResponse.json(
      {
        success: false,
        decision: "human_review",
        published: false,
        listing_status: "pending_admin_review",
        message,
      },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
}

function parseListingInput(value: unknown): ListingModerationInput {
  if (!isRecord(value)) {
    throw new AiModerationError("بدنه درخواست باید یک شیء JSON باشد.", 400);
  }

  const listingId = toInteger(value.listing_id);
  const title = toText(value.title, 240);
  const description = toText(value.description, 6_000);
  const imageUrls = parseImageUrls(value.image_urls);

  if (listingId <= 0) {
    throw new AiModerationError("شناسه آگهی معتبر نیست.", 400);
  }

  if (!title) {
    throw new AiModerationError("عنوان آگهی الزامی است.", 400);
  }

  return {
    listing_id: listingId,
    title,
    description,
    category_code: toOptionalText(value.category_code, 80),
    brand: toOptionalText(value.brand, 120),
    model: toOptionalText(value.model, 120),
    production_year: toOptionalNumber(value.production_year),
    mileage_km: toOptionalNumber(value.mileage_km),
    price_toman: toOptionalNumber(value.price_toman),
    province: toOptionalText(value.province, 120),
    city: toOptionalText(value.city, 120),
    neighborhood: toOptionalText(value.neighborhood, 180),
    image_urls: imageUrls,
    duplicate_similarity: toOptionalProbability(value.duplicate_similarity),
  };
}

function parseImageUrls(value: unknown) {
  if (value === undefined) return [];

  if (!Array.isArray(value) || value.length > 8) {
    throw new AiModerationError(
      "image_urls باید آرایه‌ای با حداکثر ۸ تصویر باشد.",
      400,
    );
  }

  const allowedHosts = new Set(
    (process.env.CHAKOD_AI_IMAGE_HOSTS || DEFAULT_IMAGE_HOSTS.join(","))
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );

  return value.map((item) => {
    if (typeof item !== "string" || item.length > 2_048) {
      throw new AiModerationError("نشانی تصویر معتبر نیست.", 400);
    }

    let url: URL;

    try {
      url = new URL(item);
    } catch {
      throw new AiModerationError("نشانی تصویر معتبر نیست.", 400);
    }

    if (
      url.protocol !== "https:" ||
      !allowedHosts.has(url.hostname.toLowerCase())
    ) {
      throw new AiModerationError(
        "میزبان تصویر برای بررسی هوشمند مجاز نیست.",
        400,
      );
    }

    return url.toString();
  });
}

function toText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function toOptionalText(value: unknown, maxLength: number) {
  const text = toText(value, maxLength);
  return text || undefined;
}

function toInteger(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) ? number : 0;
}

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function toOptionalProbability(value: unknown) {
  const number = toOptionalNumber(value);

  if (number === undefined) return undefined;

  return Math.min(1, Math.max(0, number));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
