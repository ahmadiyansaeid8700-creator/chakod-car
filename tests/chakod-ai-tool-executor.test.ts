import assert from "node:assert/strict";
import test from "node:test";

import {
  ChakodAiToolError,
  runChakodAiReadOnlyTool,
} from "../lib/chakod-ai-manager/tool-executor.ts";

const ADMIN_TOKEN = "a".repeat(64);

test("tool executor rejects requests without a valid admin session", async () => {
  await assert.rejects(
    () => runChakodAiReadOnlyTool("manager_status", ""),
    (error: unknown) =>
      error instanceof ChakodAiToolError &&
      error.code === "missing_session",
  );
});

test("business overview exposes only sanitized summary data", async () => {
  const result = await runChakodAiReadOnlyTool(
    "businesses_overview",
    ADMIN_TOKEN,
    async () =>
      new Response(
        JSON.stringify({
          success: true,
          total: 9,
          can_manage: true,
          stats: {
            total: 9,
            pending: 2,
            approved: 7,
            owner_mobile: "09120000000",
          },
          items: [
            {
              owner_mobile: "09120000000",
              owner_name: "Private User",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
  );

  const serialized = JSON.stringify(result);

  assert.equal(serialized.includes("09120000000"), false);
  assert.equal(serialized.includes("owner_name"), false);
  assert.equal(serialized.includes("items"), false);

  assert.equal(
    (result.data as Record<string, unknown>).total,
    9,
  );
});

test("commerce overview never forwards raw warning text", async () => {
  const result = await runChakodAiReadOnlyTool(
    "commerce_health",
    ADMIN_TOKEN,
    async () =>
      new Response(
        JSON.stringify({
          success: true,
          summary: {
            pending_orders: 4,
            paid_orders_30d: 12,
            revenue_30d: 1000000,
            pending_banners: 1,
            active_subscriptions: 3,
          },
          capabilities: {
            pricing_view: true,
            sensitive_finance: true,
          },
          warnings: ["private warning with 09121111111"],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
  );

  const serialized = JSON.stringify(result);

  assert.equal(serialized.includes("private warning"), false);
  assert.equal(serialized.includes("09121111111"), false);
  assert.equal(serialized.includes("sensitive_finance"), false);
  assert.equal(serialized.includes("warningsCount"), true);
});
