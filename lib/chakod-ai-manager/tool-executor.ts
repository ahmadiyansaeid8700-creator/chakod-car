import {
  authApiUrl,
  parseJsonResponse,
} from "../chakod-auth-proxy.ts";
import { getChakodAiManagerStatus } from "./config.ts";

export type ChakodAiExecutableToolId =
  | "manager_status"
  | "listing_moderation_status"
  | "listings_review_overview"
  | "businesses_overview"
  | "commerce_health"
  | "site_operations_summary";

type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
const BUSINESS_STAT_KEYS = [
  "total",
  "pending",
  "approved",
  "rejected",
  "suspended",
  "featured",
] as const;
const COMMERCE_SUMMARY_KEYS = [
  "pending_orders",
  "paid_orders_30d",
  "revenue_30d",
  "active_subscriptions",
] as const;
const SAFE_CAPABILITY_KEYS = [
  "pricing_view",
  "orders_view",
  "subscriptions_view",
  "discounts_view",
  "financial_reports",
  "audit_view",
] as const;

export class ChakodAiToolError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ChakodAiToolError";
    this.status = status;
    this.code = code;
  }
}

export async function runChakodAiReadOnlyTool(
  toolId: string,
  sessionToken: string,
  fetchImpl: FetchLike = fetch,
): Promise<Record<string, unknown>> {
  if (!TOKEN_PATTERN.test(sessionToken)) {
    throw new ChakodAiToolError("Admin session is required.", 401, "missing_session");
  }

  switch (toolId as ChakodAiExecutableToolId) {
    case "manager_status":
      return managerStatusSnapshot();
    case "listing_moderation_status":
      return moderationStatusSnapshot();
    case "listings_review_overview":
      return listingsOverview(sessionToken, fetchImpl);
    case "businesses_overview":
      return businessesOverview(sessionToken, fetchImpl);
    case "commerce_health":
      return commerceHealth(sessionToken, fetchImpl);
    case "site_operations_summary":
      return siteOperationsSummary(sessionToken, fetchImpl);
    default:
      throw new ChakodAiToolError("Unknown AI tool.", 404, "unknown_tool");
  }
}

function managerStatusSnapshot() {
  const manager = getChakodAiManagerStatus();

  return {
    tool: "manager_status",
    generatedAt: new Date().toISOString(),
    data: {
      version: manager.version,
      requestedEnabled: manager.requestedEnabled,
      ready: manager.ready,
      provider: manager.provider,
      providerConfigured: manager.providerConfigured,
      mode: manager.mode,
      writeActionsAllowed: manager.writeActionsAllowed,
    },
  };
}

function moderationStatusSnapshot() {
  const manager = getChakodAiManagerStatus();

  return {
    tool: "listing_moderation_status",
    generatedAt: new Date().toISOString(),
    data: {
      preserved: manager.listingModeration.preserved,
      configured: manager.listingModeration.configured,
    },
  };
}

async function listingsOverview(sessionToken: string, fetchImpl: FetchLike) {
  const payload = await readAdminJson(
    "/api/admin-listings.php?status=all&risk=all&owner_type=all&page=1&limit=1",
    sessionToken,
    fetchImpl,
  );
  const pagination = recordField(payload, "pagination");

  return {
    tool: "listings_review_overview",
    generatedAt: new Date().toISOString(),
    data: {
      stats: safeNumericStats(payload.stats),
      total: finiteNumber(pagination.total),
      pages: finiteNumber(pagination.pages),
    },
  };
}

async function businessesOverview(sessionToken: string, fetchImpl: FetchLike) {
  const payload = await readAdminJson(
    "/api/admin-businesses.php?limit=1",
    sessionToken,
    fetchImpl,
  );
  const stats = recordField(payload, "stats");

  return {
    tool: "businesses_overview",
    generatedAt: new Date().toISOString(),
    data: {
      total: finiteNumber(payload.total),
      stats: Object.fromEntries(
        BUSINESS_STAT_KEYS.map((key) => [key, finiteNumber(stats[key])]),
      ),
      canManage: payload.can_manage === true,
    },
  };
}

async function commerceHealth(sessionToken: string, fetchImpl: FetchLike) {
  const payload = await readAdminJson(
    "/api/admin-commerce.php",
    sessionToken,
    fetchImpl,
    14_000,
  );
  const capabilities = recordField(payload, "capabilities");
  const summary = recordField(payload, "summary");

  return {
    tool: "commerce_health",
    generatedAt: new Date().toISOString(),
    data: {
      summary: Object.fromEntries(
        COMMERCE_SUMMARY_KEYS.map((key) => [
          key,
          summary[key] === null ? null : finiteNumber(summary[key]),
        ]),
      ),
      capabilities: Object.fromEntries(
        SAFE_CAPABILITY_KEYS.map((key) => [key, capabilities[key] === true]),
      ),
      warningsCount: Array.isArray(payload.warnings) ? payload.warnings.length : 0,
    },
  };
}

async function siteOperationsSummary(sessionToken: string, fetchImpl: FetchLike) {
  const [listings, businesses, commerce] = await Promise.allSettled([
    listingsOverview(sessionToken, fetchImpl),
    businessesOverview(sessionToken, fetchImpl),
    commerceHealth(sessionToken, fetchImpl),
  ]);

  return {
    tool: "site_operations_summary",
    generatedAt: new Date().toISOString(),
    data: {
      manager: managerStatusSnapshot().data,
      moderation: moderationStatusSnapshot().data,
      listings: settledValue(listings),
      businesses: settledValue(businesses),
      commerce: settledValue(commerce),
    },
  };
}

async function readAdminJson(
  endpoint: string,
  sessionToken: string,
  fetchImpl: FetchLike,
  timeoutMs = 12_000,
) {
  let response: Response;

  try {
    response = await fetchImpl(authApiUrl(endpoint), {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${sessionToken}`,
        "X-Session-Token": sessionToken,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ChakodAiToolError(
      "Read-only admin source is unavailable.",
      503,
      "tool_source_unavailable",
    );
  }

  const payload = await parseJsonResponse(response);

  if (!payload) {
    throw new ChakodAiToolError(
      "Read-only admin source returned invalid JSON.",
      502,
      "invalid_tool_source_response",
    );
  }

  if (!response.ok || payload.success === false) {
    const message =
      typeof payload.message === "string"
        ? payload.message
        : "Read-only admin source failed.";
    throw new ChakodAiToolError(
      message.slice(0, 240),
      response.status === 401 || response.status === 403 ? 403 : 502,
      "tool_source_error",
    );
  }

  return payload;
}

function recordField(value: unknown, key: string): Record<string, unknown> {
  if (!isRecord(value)) return {};
  const nested = value[key];
  return isRecord(nested) ? nested : {};
}

function safeNumericStats(value: unknown) {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => /^[a-z0-9_]{1,48}$/i.test(key))
      .filter(([, entry]) => typeof entry === "number" || typeof entry === "string")
      .map(([key, entry]) => [key, finiteNumber(entry)]),
  );
}

function finiteNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function settledValue(
  result: PromiseSettledResult<Record<string, unknown>>,
) {
  if (result.status === "fulfilled") {
    return { ok: true, snapshot: result.value };
  }

  return {
    ok: false,
    error:
      result.reason instanceof ChakodAiToolError
        ? result.reason.code
        : "tool_failed",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
