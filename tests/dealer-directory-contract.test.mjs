import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("keeps legacy dealers route as canonical account redirect", async () => {
  const legacy = await source("app/dealers/page.tsx");
  assert.match(legacy, /redirect\("\/account\/business\/dealers"\)/);
});

test("keeps multi-dealer management behind authenticated proxy", async () => {
  const route = await source("app/api/auth/dealers/route.ts");
  assert.match(route, /\/api\/my-dealers\.php/);
  assert.match(route, /proxyAuthenticatedJson/);
  assert.match(route, /rejectCrossSiteMutation/);
  assert.doesNotMatch(route, /ownerKey|idempotencyKey/);
});

test("keeps dealer management reachable from Account V2 without legacy account nav", async () => {
  const layout = await source("app/account/layout.tsx");
  const accountV2 = await source("app/account-v2/page.tsx");
  const directory = await source("app/account/business/dealers/DealerDirectoryClient.tsx");

  assert.doesNotMatch(layout, /accountLinks|navigationShell|\/account\/business\/dealers/);
  assert.match(accountV2, /مدیریت کسب‌وکار/);
  assert.match(accountV2, /\/account\/business\?dealer_id=/);
  assert.match(directory, /\/api\/auth\/dealers/);
  assert.match(directory, /\/account\/business/);
  assert.doesNotMatch(directory, /\/dealers\/\$\{/);
});

test("removes homepage banner language from dealer command center", async () => {
  const commandCenter = await source("app/account/business/DealerCommandCenter.tsx");
  assert.match(commandCenter, /نمایشگاه منتخب/);
  assert.match(commandCenter, /نمایشگاه‌های من/);
  assert.doesNotMatch(commandCenter, /رزرو بنر/);
});
