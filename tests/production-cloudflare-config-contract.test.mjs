import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const config = await readFile(new URL("../vite.production.config.ts", import.meta.url), "utf8");

test("production Cloudflare config requires explicit production D1 values", () => {
  assert.match(config, /CLOUDFLARE_PRODUCTION_D1_DATABASE_NAME/);
  assert.match(config, /CLOUDFLARE_PRODUCTION_D1_DATABASE_ID/);
  assert.match(config, /requiredProductionValue/);
});

test("production Cloudflare config cannot fall back to staging resources", () => {
  assert.doesNotMatch(config, /chakod-staging/);
  assert.doesNotMatch(config, /c38ca246-c71b-4a64-98fb-d0c946da3cb9/i);
  assert.doesNotMatch(config, /staging\.chakod\.com/);
});

test("production build cannot attach a custom domain or enable fixtures by itself", () => {
  assert.doesNotMatch(config, /\broutes\s*:/);
  assert.match(config, /workers_dev:\s*false/);
  assert.match(config, /preview_urls:\s*false/);
  assert.match(config, /NEXT_PUBLIC_PRELAUNCH_FIXTURES[^\n]*\n\s*process\.env\.PRELAUNCH_FIXTURES|NEXT_PUBLIC_PRELAUNCH_FIXTURES/);
  assert.match(config, /JSON\.stringify\("false"\)/);
});
