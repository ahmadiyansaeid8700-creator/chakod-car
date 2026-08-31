import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("staging deployment applies remote D1 migrations fail-closed before Worker upload", async () => {
  const workflow = await source(".github/workflows/staging-deploy.yml");
  const packageJson = JSON.parse(await source("package.json"));

  assert.equal(packageJson.scripts["d1:migrate:staging"], "node scripts/migrate-staging-d1.mjs");
  assert.equal(packageJson.scripts["prebuild:cloudflare"], "npm run d1:migrate:staging");
  assert.match(workflow, /npm run build:cloudflare/);

  const buildIndex = workflow.indexOf("npm run build:cloudflare");
  const uploadIndex = workflow.indexOf("wrangler versions upload");
  assert.ok(buildIndex >= 0, "staging Worker build step must exist");
  assert.ok(uploadIndex > buildIndex, "Worker upload must remain after the build lifecycle migration gate");
});

test("remote staging D1 migration gate pins the database and rejects partial schema", async () => {
  const script = await source("scripts/migrate-staging-d1.mjs");

  assert.match(script, /agent\/launch-3-local-baseline/);
  assert.match(script, /GITHUB_ACTIONS/);
  assert.match(script, /GITHUB_REF_NAME/);
  assert.match(script, /CHAKOD_APPLY_STAGING_D1_MIGRATIONS/);
  assert.match(script, /chakod-staging/);
  assert.match(script, /c38ca246-c71b-4a64-98fb-d0c946da3cb9/);
  assert.match(script, /drizzle\/0010_credit_ledger\.sql/);
  assert.match(script, /credit_balances/);
  assert.match(script, /credit_ledger/);
  assert.match(script, /credit_ledger_prevent_negative/);
  assert.match(script, /credit_ledger_apply_balance/);
  assert.match(script, /partial/i);
  assert.match(script, /--remote/);
  assert.match(script, /--json/);
  assert.match(script, /PRAGMA quick_check/i);
  assert.match(script, /time-travel/);
  assert.match(script, /unlisted/i);
});
