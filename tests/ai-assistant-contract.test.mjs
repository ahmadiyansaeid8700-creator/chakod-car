import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("does not mount a public AI assistant globally", async () => {
  const layout = await source("app/layout.tsx");
  assert.doesNotMatch(layout, /ChakodAiAssistant/);
});

test("keeps Chakod AI Manager admin-first and read-only", async () => {
  const page = await source("app/admin/ai/page.tsx");
  const tools = await source("lib/chakod-ai-manager/tools.ts");
  assert.match(page, /مرکز هوش مصنوعی مدیریت/);
  assert.match(page, /Write Action خودکار وجود ندارد/);
  assert.match(tools, /scope: "read_only"/);
});

test("keeps AI Manager disabled unless explicitly configured", async () => {
  const config = await source("lib/chakod-ai-manager/config.ts");
  assert.match(config, /return "disabled"/);
  assert.match(config, /requestedEnabled && providerConfigured/);
  assert.match(config, /writeActionsAllowed: false/);
});

test("protects manager routes with admin access", async () => {
  const statusRoute = await source("app/api/ai/manager/status/route.ts");
  const suggestRoute = await source("app/api/ai/manager/suggest/route.ts");
  const toolRoute = await source("app/api/ai/manager/tools/[toolId]/route.ts");
  for (const route of [statusRoute, suggestRoute, toolRoute]) {
    assert.match(route, /hasAdminRouteAccess/);
    assert.match(route, /readServerIdentity/);
  }
  assert.match(suggestRoute, /writeActionsExecuted: false/);
});

test("limits local provider endpoints to loopback hosts", async () => {
  const config = await source("lib/chakod-ai-manager/config.ts");
  assert.match(config, /localhost/);
  assert.match(config, /127\.0\.0\.1/);
  assert.match(config, /::1/);
  assert.match(config, /LOOPBACK_HOSTS\.has/);
});

test("reads only sanitized operational summaries before AI suggestions", async () => {
  const executor = await source("lib/chakod-ai-manager/tool-executor.ts");
  assert.match(executor, /site_operations_summary/);
  assert.match(executor, /warningsCount/);
  assert.match(executor, /safeNumericStats/);
  assert.doesNotMatch(executor, /method:\s*"(?:POST|PUT|PATCH|DELETE)"/);
});
