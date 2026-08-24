import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("keeps Chakod AI mounted globally", async () => {
  const layout = await source("app/layout.tsx");
  assert.match(layout, /ChakodAiAssistant/);
  assert.match(layout, /<ChakodAiAssistant\s*\/>/);
});

test("keeps offline AI fallback when cloud key is unavailable", async () => {
  const route = await source("app/api/ai/assistant/route.ts");
  assert.match(route, /if \(!process\.env\.OPENAI_API_KEY\)/);
  assert.match(route, /buildOfflineAssistantReply/);
  assert.match(route, /cloud_not_configured/);
  assert.match(route, /cloud_unavailable/);
});

test("keeps assistant request limits and no-store response", async () => {
  const route = await source("app/api/ai/assistant/route.ts");
  assert.match(route, /MAX_REQUEST_BYTES/);
  assert.match(route, /MAX_MESSAGES/);
  assert.match(route, /MAX_MESSAGE_LENGTH/);
  assert.match(route, /RATE_LIMIT/);
  assert.match(route, /Cache-Control/);
  assert.match(route, /no-store/);
});

test("does not send an admin session token in public assistant mode", async () => {
  const client = await source("app/components/ChakodAiAssistant.tsx");
  assert.match(client, /currentMode === "admin"/);
  assert.match(client, /chakod_session_token/);
  assert.match(client, /\/api\/ai\/assistant/);
});

test("supports cookie-backed admin mode and effective admin permissions", async () => {
  const route = await source("app/api/ai/assistant/route.ts");
  const context = await source("lib/ai-assistant/context.ts");
  const client = await source("app/components/ChakodAiAssistant.tsx");

  assert.match(route, /chakod_session=/);
  assert.match(context, /Array\.isArray\(me\.permissions\)/);
  assert.match(client, /path\.startsWith\("\/admin"\) \? "admin" : "user"/);
});
