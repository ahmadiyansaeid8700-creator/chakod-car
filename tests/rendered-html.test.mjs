import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const workerEnv = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const workerContext = {
  waitUntil() {},
  passThroughOnException() {},
};

test("renders development preview metadata", async () => {
  const worker = await loadWorker();

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    workerEnv,
    workerContext,
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("returns a safe assistant setup response without exposing a key", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/api/ai/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "user",
        messages: [{ role: "user", content: "تا دو میلیارد چی بخرم؟" }],
        page: { path: "/", title: "چاکود" },
      }),
    }),
    workerEnv,
    workerContext,
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.configured, false);
  assert.equal(payload.data_status, "unavailable");
  assert.deepEqual(payload.cards, []);
  assert.doesNotMatch(JSON.stringify(payload), /OPENAI_API_KEY|Bearer\s/i);
});

test("rejects an invalid local login request before contacting SMS", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/api/auth/send-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mobile: "123",
        accept_terms: true,
      }),
    }),
    workerEnv,
    workerContext,
  );
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.success, false);
  assert.match(payload.message, /شماره موبایل/);
});
