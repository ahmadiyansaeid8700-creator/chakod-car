import assert from "node:assert/strict";
import test from "node:test";

import {
  isLocalDevelopmentHost,
  LOCAL_DEVELOPMENT_SESSION_TOKEN,
  resolveLocalDevelopmentIdentity,
} from "../lib/local-development-session.ts";

test("accepts only localhost development hosts", () => {
  assert.equal(isLocalDevelopmentHost("localhost:5173"), true);
  assert.equal(isLocalDevelopmentHost("127.0.0.1:5173"), true);
  assert.equal(isLocalDevelopmentHost("[::1]:5173"), true);
  assert.equal(isLocalDevelopmentHost("chakod.com"), false);
});

test("resolves a local development user without granting admin access", () => {
  const userIdentity = resolveLocalDevelopmentIdentity({
    nodeEnv: "development",
    hostname: "127.0.0.1:5173",
    token: LOCAL_DEVELOPMENT_SESSION_TOKEN,
    endpoint: "/api/me.php",
  });
  const adminIdentity = resolveLocalDevelopmentIdentity({
    nodeEnv: "development",
    hostname: "127.0.0.1:5173",
    token: LOCAL_DEVELOPMENT_SESSION_TOKEN,
    endpoint: "/api/admin-me.php",
  });

  assert.equal(userIdentity?.success, true);
  assert.equal(userIdentity?.logged_in, true);
  assert.equal(userIdentity?.is_admin, false);
  assert.equal(adminIdentity?.success, false);
  assert.equal(adminIdentity?.logged_in, true);
  assert.equal(adminIdentity?.is_admin, false);
});

test("rejects the development marker outside local development", () => {
  assert.equal(
    resolveLocalDevelopmentIdentity({
      nodeEnv: "production",
      hostname: "127.0.0.1:5173",
      token: LOCAL_DEVELOPMENT_SESSION_TOKEN,
      endpoint: "/api/me.php",
    }),
    null,
  );
  assert.equal(
    resolveLocalDevelopmentIdentity({
      nodeEnv: "development",
      hostname: "chakod.com",
      token: LOCAL_DEVELOPMENT_SESSION_TOKEN,
      endpoint: "/api/me.php",
    }),
    null,
  );
  assert.equal(
    resolveLocalDevelopmentIdentity({
      nodeEnv: "development",
      hostname: "127.0.0.1:5173",
      token: "not-the-development-token",
      endpoint: "/api/me.php",
    }),
    null,
  );
});
