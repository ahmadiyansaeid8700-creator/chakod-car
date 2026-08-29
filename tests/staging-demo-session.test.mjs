import assert from "node:assert/strict";
import test from "node:test";

import {
  createStagingDemoToken,
  isStagingDemoEnabled,
  resolveStagingDemoIdentity,
} from "../lib/staging-demo-session.ts";

test("keeps fixture login available only on the staging custom domain", () => {
  assert.equal(isStagingDemoEnabled("staging.chakod.com"), true);
  assert.equal(isStagingDemoEnabled("STAGING.CHAKOD.COM:443"), true);
  assert.equal(isStagingDemoEnabled("chakod.com"), false);
  assert.equal(isStagingDemoEnabled("www.chakod.com"), false);
  assert.equal(isStagingDemoEnabled("chakod-car-staging.example.workers.dev"), false);
});

test("resolves a deterministic demo identity without granting admin access", () => {
  const token = createStagingDemoToken("09000000000");
  const identity = resolveStagingDemoIdentity({
    hostname: "staging.chakod.com",
    token,
    endpoint: "/api/me.php",
  });
  const adminIdentity = resolveStagingDemoIdentity({
    hostname: "staging.chakod.com",
    token,
    endpoint: "/api/admin-me.php",
  });

  assert.equal(identity?.success, true);
  assert.equal(identity?.staging_demo, true);
  assert.equal(identity?.user.account_type, "personal");
  assert.equal(adminIdentity?.logged_in, true);
  assert.equal(adminIdentity?.is_admin, false);
});

test("rejects demo tokens on production hosts", () => {
  const token = createStagingDemoToken("09000000000");
  assert.equal(
    resolveStagingDemoIdentity({
      hostname: "chakod.com",
      token,
      endpoint: "/api/me.php",
    }),
    null,
  );
});
