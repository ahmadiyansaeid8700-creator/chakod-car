import assert from "node:assert/strict";
import test from "node:test";

import {
  getChakodAiManagerStatus,
  normalizeAiProvider,
  readBooleanFlag,
} from "../lib/chakod-ai-manager/config.ts";

test("AI manager is disabled and not ready by default", () => {
  const status = getChakodAiManagerStatus({});

  assert.equal(status.requestedEnabled, false);
  assert.equal(status.ready, false);
  assert.equal(status.provider, "disabled");
  assert.equal(status.writeActionsAllowed, false);
});

test("OpenAI provider is ready only when explicitly enabled and configured", () => {
  const status = getChakodAiManagerStatus({
    CHAKOD_AI_MANAGER_ENABLED: "true",
    CHAKOD_AI_MANAGER_PROVIDER: "openai",
    OPENAI_API_KEY: "configured",
  });

  assert.equal(status.requestedEnabled, true);
  assert.equal(status.provider, "openai");
  assert.equal(status.providerConfigured, true);
  assert.equal(status.ready, true);
});

test("Local provider needs an endpoint before manager can be ready", () => {
  const missingEndpoint = getChakodAiManagerStatus({
    CHAKOD_AI_MANAGER_ENABLED: "1",
    CHAKOD_AI_MANAGER_PROVIDER: "local",
  });
  const configured = getChakodAiManagerStatus({
    CHAKOD_AI_MANAGER_ENABLED: "1",
    CHAKOD_AI_MANAGER_PROVIDER: "local",
    CHAKOD_AI_LOCAL_ENDPOINT: "http://127.0.0.1:11434",
  });

  assert.equal(missingEndpoint.ready, false);
  assert.equal(configured.ready, true);
});

test("Listing moderation readiness is reported without exposing secrets", () => {
  const status = getChakodAiManagerStatus({
    OPENAI_API_KEY: "configured",
    CHAKOD_AI_WEBHOOK_SECRET: "configured",
  });

  assert.deepEqual(status.listingModeration, {
    preserved: true,
    configured: true,
  });
});

test("Unknown providers and flags fail closed", () => {
  assert.equal(normalizeAiProvider("other"), "disabled");
  assert.equal(readBooleanFlag("yes"), true);
  assert.equal(readBooleanFlag("no"), false);
});
