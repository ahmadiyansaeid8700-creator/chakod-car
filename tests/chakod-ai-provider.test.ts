import assert from "node:assert/strict";
import test from "node:test";

import { normalizeLocalEndpoint } from "../lib/chakod-ai-manager/config.ts";
import {
  ChakodAiProviderError,
  runChakodAiProvider,
} from "../lib/chakod-ai-manager/provider.ts";

test("provider fails closed while manager is disabled", async () => {
  await assert.rejects(
    () =>
      runChakodAiProvider(
        { instructions: "test", input: "hello" },
        {},
      ),
    (error: unknown) =>
      error instanceof ChakodAiProviderError &&
      error.code === "manager_not_ready",
  );
});

test("OpenAI adapter uses Responses API without persistence", async () => {
  let capturedUrl = "";
  let capturedBody: Record<string, unknown> = {};
  let authorization = "";

  const result = await runChakodAiProvider(
    { instructions: "فقط پیشنهاد بده", input: "وضعیت بازار را خلاصه کن" },
    {
      CHAKOD_AI_MANAGER_ENABLED: "true",
      CHAKOD_AI_MANAGER_PROVIDER: "openai",
      CHAKOD_AI_MANAGER_OPENAI_MODEL: "test-model",
      OPENAI_API_KEY: "server-secret",
    },
    async (input, init) => {
      capturedUrl = String(input);
      authorization = new Headers(init?.headers).get("authorization") || "";
      capturedBody = JSON.parse(String(init?.body));

      return new Response(
        JSON.stringify({
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: "پاسخ آزمایشی" }],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  );

  assert.equal(capturedUrl, "https://api.openai.com/v1/responses");
  assert.equal(authorization, "Bearer server-secret");
  assert.equal(capturedBody.model, "test-model");
  assert.equal(capturedBody.store, false);
  assert.equal(result.provider, "openai");
  assert.equal(result.text, "پاسخ آزمایشی");
  assert.equal(JSON.stringify(result).includes("server-secret"), false);
});

test("local adapter only accepts loopback endpoints", async () => {
  assert.equal(normalizeLocalEndpoint("https://example.com/model"), null);
  assert.equal(
    normalizeLocalEndpoint("http://127.0.0.1:11434/api/generate"),
    "http://127.0.0.1:11434/api/generate",
  );

  const result = await runChakodAiProvider(
    { instructions: "read only", input: "hello" },
    {
      CHAKOD_AI_MANAGER_ENABLED: "true",
      CHAKOD_AI_MANAGER_PROVIDER: "local",
      CHAKOD_AI_LOCAL_ENDPOINT: "http://127.0.0.1:11434/api/generate",
    },
    async () =>
      new Response(JSON.stringify({ text: "local result", model: "local-test" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );

  assert.deepEqual(result, {
    provider: "local",
    model: "local-test",
    text: "local result",
  });
});

test("transport failures are isolated behind a safe error", async () => {
  await assert.rejects(
    () =>
      runChakodAiProvider(
        { instructions: "test", input: "hello" },
        {
          CHAKOD_AI_MANAGER_ENABLED: "true",
          CHAKOD_AI_MANAGER_PROVIDER: "openai",
          OPENAI_API_KEY: "configured",
        },
        async () => {
          throw new Error("network details that must not escape");
        },
      ),
    (error: unknown) =>
      error instanceof ChakodAiProviderError &&
      error.code === "provider_unavailable" &&
      !error.message.includes("network details"),
  );
});
