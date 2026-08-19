import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("keeps featured showroom booking tied to managed dealer and province capacity", async () => {
  const booking = await source("app/api/finance/featured-showrooms/route.ts");
  assert.match(booking, /this نمایشگاه|این نمایشگاه/);
  assert.match(booking, /commerceData\.dealers/);
  assert.match(booking, /banner_day_capacity/);
  assert.match(booking, /reservedDays > 90/);
  assert.match(booking, /rejectCrossSiteMutation/);
});

test("keeps homepage product named featured showroom even when legacy Commerce banner fields are reused", async () => {
  const booking = await source("app/api/finance/featured-showrooms/route.ts");
  assert.match(booking, /public_product_code:\s*"dealership_placement"/);
  assert.match(booking, /service_title:\s*"جایگاه نمایشگاه منتخب"/);
  assert.match(booking, /legacy_commerce_service_key/);
});

test("only exposes approved and currently active featured showroom placements publicly", async () => {
  const publicRoute = await source("app/api/featured-showrooms/route.ts");
  assert.match(publicRoute, /\["approved", "scheduled", "active"\]/);
  assert.match(publicRoute, /lte\(featuredShowroomPlacements\.startDate, today\)/);
  assert.match(publicRoute, /gte\(featuredShowroomPlacements\.endDate, today\)/);
});

test("requires an admin and a paid order before approving a featured showroom", async () => {
  const admin = await source("app/api/admin/featured-showrooms/route.ts");
  assert.match(admin, /readServerIdentity\("\/api\/admin-me\.php"\)/);
  assert.match(admin, /identity\.is_admin === true/);
  assert.match(admin, /order\.status !== "paid"/);
  assert.match(admin, /\["pending_review", "rejected"\]/);
  assert.match(admin, /status:\s*"approved"/);
});

test("moves a paid featured showroom reservation to review after gateway verification", async () => {
  const verify = await source("app/api/payments/verify/route.ts");
  assert.match(verify, /moveFeaturedShowroomToReview/);
  assert.match(verify, /status:\s*"pending_review"/);
});

test("keeps retired homepage banner routes out of the launch product", async () => {
  const legacyUserApi = await source("app/api/banner-reservations/route.ts");
  const legacyAdminApi = await source("app/api/admin/banner-reservations/route.ts");
  const legacyHomepageAdmin = await source("app/admin/homepage-banners/page.tsx");
  const legacyReservationsAdmin = await source("app/admin/banner-reservations/page.tsx");

  assert.match(legacyUserApi, /LEGACY_BANNER_RESERVATION_RETIRED/);
  assert.match(legacyUserApi, /status:\s*410/);
  assert.match(legacyAdminApi, /LEGACY_BANNER_RESERVATION_RETIRED/);
  assert.match(legacyAdminApi, /status:\s*410/);
  assert.match(legacyHomepageAdmin, /\/admin\/featured-showrooms/);
  assert.match(legacyReservationsAdmin, /\/admin\/featured-showrooms/);
  assert.doesNotMatch(legacyUserApi, /demo_paid/);
});
