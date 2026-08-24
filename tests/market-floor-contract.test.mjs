import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("implements the configurable market-floor score and 8 AM daily cycle", async () => {
  const policy = await read("lib/market-floor.ts");
  assert.match(policy, /MARKET_FLOOR_PROVINCE_CAPACITY = 10/);
  assert.match(policy, /MARKET_FLOOR_INITIAL_CARDS = 3/);
  assert.match(policy, /MARKET_FLOOR_MIN_SCORE = 80/);
  assert.match(policy, /getUTCDate\(\), 8, 0, 0/);
  for (const component of ["price", "discount", "popularity", "completeness", "quality", "condition"]) assert.match(policy, new RegExp(component));
  assert.match(policy, /decision: "human_review"/);
});

test("persists cards, decisions, reservations and province-cycle ranking", async () => {
  const schema = await read("db/schema.ts");
  const migration = await read("drizzle/0009_market_floor.sql");
  const route = await read("app/api/market-floor/route.ts");
  for (const token of ["marketFloorWallets", "marketFloorEntries", "availableCards", "scoreJson", "reservationForNextCycle"]) assert.match(schema, new RegExp(token));
  assert.match(migration, /market_floor_owner_listing_cycle_unique/);
  assert.match(route, /MARKET_FLOOR_PROVINCE_CAPACITY/);
  assert.match(route, /displacedEntryId/);
  assert.match(route, /cardReturned/);
  assert.match(route, /reserve_next_cycle/);
});

test("removes the old daily-card implementation and exposes market floor to users and admins", async () => {
  const home = await read("app/page.tsx");
  const mobile = await read("app/components/MobileBottomNav.tsx");
  const admin = await read("app/admin/AdminShell.tsx");
  const legacy = await read("app/account/showcase/page.tsx");
  assert.match(home, /کف بازار/);
  assert.match(mobile, /MarketFloorIcon/);
  assert.match(admin, /\/admin\/market-floor/);
  assert.match(legacy, /redirect\("\/account\/market-floor"\)/);
  assert.doesNotMatch(home + mobile + legacy, /کارت روز|daily-card|DailyCard/);
});

test("presents the public market floor as a live responsive marketplace", async () => {
  const page = await read("app/market-floor/page.tsx");
  const styles = await read("app/market-floor/page.module.css");

  assert.match(page, /کف بازار چاکود/);
  assert.match(page, /loadHomeLocation/);
  assert.match(page, /HOME_LOCATION_EVENT/);
  assert.match(page, /getHomeLocationScopes/);
  assert.match(page, /remainingTime/);
  assert.match(page, /aria-label="بازگشت به صفحه قبل"/);
  assert.match(page, /router\.back\(\)/);
  assert.match(page, /MobileBottomNav/);
  assert.doesNotMatch(page, /selectedProvince/);
  assert.match(page, /از اینجا به بعد؛ فرصت‌های سراسر ایران/);
  assert.match(page, /ویترین امروز در حال چیده‌شدن است/);
  assert.match(styles, /\.heroVisual/);
  assert.match(styles, /\.locationSummary/);
  assert.match(styles, /\.backButton/);
  assert.match(styles, /\.nationwideSeparator/);
  assert.match(styles, /\.emptyCriteria/);
  assert.doesNotMatch(page + styles, /marketSign|carShape|awning|بزن بریم/);
  assert.match(styles, /@media\(max-width:620px\)/);
  assert.match(styles, /scroll-snap-type:x mandatory/);
});
