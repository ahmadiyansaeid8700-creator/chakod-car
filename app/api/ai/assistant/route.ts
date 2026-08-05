import { NextResponse } from "next/server";

import type {
  AssistantMessage,
  AssistantMode,
  AssistantPageContext,
} from "@/lib/ai-assistant/contracts";
import {
  buildAdminKnowledge,
  buildPublicKnowledge,
} from "@/lib/ai-assistant/context";
import { buildOfflineAssistantReply } from "@/lib/ai-assistant/offline";
import {
  askChakodAssistant,
  AssistantServiceError,
} from "@/lib/ai-assistant/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 36_000;
const MAX_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 2_000;
const RATE_WINDOW_MS = 10 * 60 * 1_000;
const RATE_LIMIT = 24;

type RateEntry = {
  count: number;
  resetAt: number;
};

type RateGlobal = typeof globalThis & {
  __chakodAssistantRateLimit?: Map<string, RateEntry>;
};

const rateGlobal = globalThis as RateGlobal;
const rateStore =
  rateGlobal.__chakodAssistantRateLimit ?? new Map<string, RateEntry>();
rateGlobal.__chakodAssistantRateLimit = rateStore;

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);

    if (contentLength > MAX_REQUEST_BYTES) {
      return jsonError("حجم گفت‌وگو بیش از حد مجاز است.", 413);
    }

    if (!consumeRateLimit(rateKey(request))) {
      return jsonError(
        "تعداد درخواست‌ها زیاد شده است. چند دقیقه دیگر دوباره امتحان کن.",
        429,
      );
    }

    const payload: unknown = await request.json();
    const parsed = parseRequest(payload);
    const lastMessage = parsed.messages.at(-1)?.content || "";
    const requestedAdmin =
      parsed.requestedMode === "admin" &&
      parsed.page.path.startsWith("/admin");
    const sessionToken = readSessionToken(request);
    const adminKnowledge = requestedAdmin
      ? await buildAdminKnowledge(parsed.page, sessionToken)
      : null;
    const knowledge =
      adminKnowledge || (await buildPublicKnowledge(lastMessage, parsed.page));

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        buildOfflineAssistantReply(
          parsed.messages,
          knowledge,
          "cloud_not_configured",
        ),
        responseInit(200),
      );
    }

    try {
      const result = await askChakodAssistant(parsed.messages, knowledge);
      return NextResponse.json(result, responseInit(200));
    } catch (error) {
      if (error instanceof AssistantServiceError) {
        return NextResponse.json(
          buildOfflineAssistantReply(
            parsed.messages,
            knowledge,
            "cloud_unavailable",
          ),
          responseInit(200),
        );
      }

      throw error;
    }
  } catch (error) {
    const status =
      error instanceof AssistantServiceError ? error.status : 400;
    const message =
      error instanceof AssistantServiceError
        ? safeServiceMessage(error)
        : error instanceof Error && error.message === "INVALID_JSON"
          ? "بدنه درخواست JSON معتبر نیست."
          : "درخواست دستیار معتبر نیست.";

    return jsonError(message, status);
  }
}

function parseRequest(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.messages)) {
    throw new Error("INVALID_REQUEST");
  }

  const messages = value.messages
    .slice(-MAX_MESSAGES)
    .map(parseMessage)
    .filter((item): item is AssistantMessage => item !== null);

  if (!messages.length || messages.at(-1)?.role !== "user") {
    throw new Error("INVALID_MESSAGES");
  }

  const pageValue = isRecord(value.page) ? value.page : {};
  const page: AssistantPageContext = {
    path: safePath(pageValue.path),
    title: cleanText(pageValue.title, 180),
    locationLabel: cleanText(pageValue.locationLabel, 180) || undefined,
    locationProvince:
      cleanText(pageValue.locationProvince, 100) || undefined,
    locationCities: Array.isArray(pageValue.locationCities)
      ? pageValue.locationCities
          .filter((item): item is string => typeof item === "string")
          .map((item) => cleanText(item, 100))
          .filter(Boolean)
          .slice(0, 12)
      : undefined,
  };
  const requestedMode: AssistantMode =
    value.mode === "admin" ? "admin" : "user";

  return { messages, page, requestedMode };
}

function parseMessage(value: unknown): AssistantMessage | null {
  if (
    !isRecord(value) ||
    (value.role !== "user" && value.role !== "assistant") ||
    typeof value.content !== "string"
  ) {
    return null;
  }

  const content = cleanText(value.content, MAX_MESSAGE_LENGTH);
  return content ? { role: value.role, content } : null;
}

function readSessionToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  const token = bearer || request.headers.get("x-session-token") || "";

  return token.trim().slice(0, 4_096);
}

function rateKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  return (
    request.headers.get("cf-connecting-ip") ||
    forwarded ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  ).trim();
}

function consumeRateLimit(key: string) {
  const now = Date.now();
  const current = rateStore.get(key);

  if (!current || current.resetAt <= now) {
    rateStore.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    pruneRateStore(now);
    return true;
  }

  if (current.count >= RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

function pruneRateStore(now: number) {
  if (rateStore.size < 1_000) return;

  for (const [key, entry] of rateStore) {
    if (entry.resetAt <= now) rateStore.delete(key);
  }
}

function safeServiceMessage(error: AssistantServiceError) {
  if (error.status === 401 || error.status === 403) {
    return "اتصال امن دستیار نیاز به بررسی تنظیمات دارد.";
  }

  if (error.status === 429) {
    return "دستیار موقتاً شلوغ است. کمی بعد دوباره امتحان کن.";
  }

  if (error.status >= 500) {
    return "پاسخ هوشمند کامل نشد. دوباره امتحان کن.";
  }

  return error.message.slice(0, 220);
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    responseInit(status),
  );
}

function responseInit(status: number) {
  return {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    },
  };
}

function safePath(value: unknown) {
  const path = cleanText(value, 500);
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.trim().replace(/\u0000/g, "").slice(0, maxLength)
    : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
