import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("implements the configurable score and a rolling 24-hour window per listing", async () => {
  const policy = await read("lib/market-floor.ts");
  assert.match(policy, /MARKET_FLOOR_PROVINCE_CAPACITY = 10/);
  assert.match(policy, /MARKET_FLOOR_INITIAL_CARDS = 3/);
  assert.match(policy, /MARKET_FLOOR_MIN_SCORE = 80/);
  assert.match(policy, /MARKET_FLOOR_DURATION_HOURS = 24/);
  assert.match(policy, /marketFloorWindow/);
  assert.match(policy, /MARKET_FLOOR_DURATION_HOURS \* 60 \* 60 \* 1000/);
  assert.doesNotMatch(policy, /getUTCDate\(\), 8, 0, 0/);
  for (const component of ["price", "discount", "popularity", "completeness", "quality", "condition"]) assert.match(policy, new RegExp(component));
  assert.match(policy, /decision: "human_review"/);
});

test("persists cards, decisions and rolling province ranking", async () => {
  const schema = await read("db/schema.ts");
  const migration = await read("drizzle/0009_market_floor.sql");
  const route = await read("app/api/market-floor/route.ts");
  for (const token of ["marketFloorWallets", "marketFloorEntries", "availableCards", "scoreJson", "reservationForNextCycle"]) assert.match(schema, new RegExp(token));
  assert.match(migration, /market_floor_owner_listing_cycle_unique/);
  assert.match(route, /MARKET_FLOOR_PROVINCE_CAPACITY/);
  assert.match(route, /displacedEntryId/);
  assert.match(route, /cardReturned/);
  assert.match(route, /gt\(marketFloorEntries\.cycleEndsAt, now\)/);
  assert.match(route, /rolling_entry: true/);
  assert.doesNotMatch(route, /reserve_next_cycle/);
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
  assert.match(page, /item\.cycleEndsAt/);
  assert.match(page, /cardTimer/);
  assert.doesNotMatch(page, /heroCountdown/);
  assert.doesNotMatch(page, /تا پایان چرخه ۲۴ ساعته/);
  assert.match(page, /1_000/);
  assert.match(page, /aria-label="بازگشت به صفحه قبل"/);
  assert.match(page, /router\.back\(\)/);
  assert.match(page, /MobileBottomNav/);
  assert.doesNotMatch(page, /selectedProvince/);
  assert.match(page, /پیشنهادهای سراسر ایران/);
  assert.match(page, /شرکت در کف بازار/);
  assert.doesNotMatch(page, /انتخاب روز هوش چاکود/);
  assert.doesNotMatch(page, /مشاهده فرصت‌های امروز/);
  assert.doesNotMatch(page, /درخواست بررسی آگهی/);
  assert.doesNotMatch(page, /فرصت‌های نزدیک شما/);
  assert.doesNotMatch(page, /ویترین امروز در حال چیده‌شدن است/);
  assert.doesNotMatch(page, /معیار ورود به ویترین/);
  assert.match(page, /در \{location\.label\} فعلاً پیشنهاد تأییدشده‌ای نیست/);
  assert.match(page, /showcaseBoard/);
  assert.match(page, /emptySlot/);
  assert.match(styles, /\.heroVisual/);
  assert.match(styles, /\.cardTimer/);
  assert.match(styles, /\.marketBody:before/);
  assert.doesNotMatch(styles, /\.heroCountdown/);
  assert.match(styles, /\.showcaseGrid\{display:grid;grid-template-columns:repeat\(2/);
  assert.doesNotMatch(styles, /\.showcaseGrid\{display:grid;grid-template-columns:repeat\(3/);
  assert.match(styles, /linear-gradient\(145deg,#0d0c0f,#181319\)/);
  assert.match(styles, /\.backButton/);
  assert.match(styles, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.nationwideSeparator/);
  assert.match(styles, /\.emptyCriteria/);
  assert.doesNotMatch(page + styles, /marketSign|carShape|awning|بزن بریم/);
  assert.match(styles, /@media\(max-width:620px\)/);
  assert.match(styles, /scroll-snap-type:x mandatory/);
});
