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

test("uses the approved homepage showroom card in compact directory mode", async () => {
  const directory = await source("app/dealerships/DealerDirectoryClient.tsx");
  const sharedCard = await source("app/components/ShowroomCard.tsx");

  assert.match(directory, /import ShowroomCard from "\.\.\/components\/ShowroomCard"/);
  assert.match(directory, /density="compact"/);
  assert.match(sharedCard, /density\?: "default" \| "compact"/);
  assert.match(sharedCard, /showroom\.href \|\|/);
  assert.doesNotMatch(directory, /selectedCard|ordinaryCard|ShowroomBanner|VehicleStrip/);
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

test("keeps dealer command center focused and scopes team invitations to verified management", async () => {
  const commandCenter = await source("app/account/business/DealerCommandCenter.tsx");
  const commandRoute = await source("app/api/auth/dealer-command-center/route.ts");

  assert.match(commandCenter, /searchParams\.get\("dealer_id"\)/);
  assert.match(commandCenter, /type TabKey = "overview" \| "listings" \| "team"/);
  assert.match(commandCenter, /\["overview", "نمای کلی", "shield"\]/);
  assert.match(commandCenter, /\["listings", "آگهی‌ها", "list"\]/);
  assert.match(commandCenter, /\["team", "تیم", "team"\]/);
  assert.match(commandCenter, /\/api\/auth\/business-verification\?dealer_id=/);
  assert.match(commandCenter, /status: "invited"/);
  assert.doesNotMatch(commandCenter, /permissionOptions|job_title|اقدامات سریع/);
  assert.match(commandRoute, /businessVerificationRequests/);
  assert.match(commandRoute, /verification\?\.status !== "verified"/);
  assert.match(commandRoute, /currentStatus === "invited"/);
  assert.doesNotMatch(commandCenter, /رزرو بنر|نمایشگاه منتخب/);
});
