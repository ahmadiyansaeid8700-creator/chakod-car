import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

import { jsonResponse } from "../../../../lib/chakod-auth-proxy";
import {
  getInstagramPublishingConfig,
  processNextInstagramStory,
  publicInstagramPublishingConfig,
} from "../../../../lib/instagram-story-publishing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function suppliedSecret(request: NextRequest) {
  const direct = request.headers.get("x-chakod-instagram-secret")?.trim() || "";
  if (direct) return direct;
  const authorization = request.headers.get("authorization") || "";
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
}

function sameSecret(actual: string, expected: string) {
  if (!actual || !expected) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function authorize(request: NextRequest) {
  const config = getInstagramPublishingConfig();
  if (!config.publisherSecret) {
    return {
      config,
      response: jsonResponse(
        { success: false, message: "Instagram publisher secret is not configured." },
        503,
      ),
    };
  }

  if (!sameSecret(suppliedSecret(request), config.publisherSecret)) {
    return {
      config,
      response: jsonResponse({ success: false, message: "Unauthorized publisher request." }, 401),
    };
  }

  return { config, response: null };
}

export async function GET(request: NextRequest) {
  const auth = authorize(request);
  if (auth.response) return auth.response;

  return jsonResponse({
    success: true,
    publisher: publicInstagramPublishingConfig(),
  });
}

export async function POST(request: NextRequest) {
  const auth = authorize(request);
  if (auth.response) return auth.response;

  const result = await processNextInstagramStory();
  return jsonResponse(result, result.success ? 200 : result.code === "not_configured" ? 503 : 502);
}
