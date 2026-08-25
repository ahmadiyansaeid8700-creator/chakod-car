import { getRuntimeEnv } from "./runtime-env";

export const MARKET_FLOOR_PROVINCE_CAPACITY = 10;
export const MARKET_FLOOR_INITIAL_CARDS = 3;
export const MARKET_FLOOR_MIN_SCORE = 80;
export const MARKET_FLOOR_DURATION_HOURS = 24;

let schemaReady: Promise<void> | null = null;

export function ensureMarketFloorSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const d1 = getRuntimeEnv().DB;
    await d1.prepare(`CREATE TABLE IF NOT EXISTS market_floor_wallets (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL, owner_key text NOT NULL UNIQUE,
      available_cards integer DEFAULT 3 NOT NULL, consumed_cards integer DEFAULT 0 NOT NULL,
      refunded_cards integer DEFAULT 0 NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`).run();
    await d1.prepare(`CREATE TABLE IF NOT EXISTS market_floor_entries (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL, owner_key text NOT NULL, listing_id integer NOT NULL,
      province text NOT NULL, requested_scope text DEFAULT 'province' NOT NULL, cycle_key text NOT NULL,
      cycle_starts_at text NOT NULL, cycle_ends_at text NOT NULL, status text DEFAULT 'pending_ai' NOT NULL,
      score integer DEFAULT 0 NOT NULL, grade text DEFAULT 'rejected' NOT NULL,
      decision text DEFAULT 'human_review' NOT NULL, reason text DEFAULT '' NOT NULL,
      score_json text DEFAULT '{}' NOT NULL, listing_snapshot_json text DEFAULT '{}' NOT NULL,
      card_state text DEFAULT 'reserved' NOT NULL, reservation_for_next_cycle integer DEFAULT false NOT NULL,
      reviewed_by text DEFAULT 'ai' NOT NULL, reviewed_at text, activated_at text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`).run();
    await d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS market_floor_owner_listing_cycle_unique ON market_floor_entries (owner_key, listing_id, cycle_key)").run();
  })().catch((error) => { schemaReady = null; throw error; });
  return schemaReady;
}

export type MarketFloorListing = {
  id: number;
  title: string;
  brand: string;
  model: string;
  trim: string;
  year: number;
  mileageKm: number;
  priceToman: number;
  marketReferenceToman: number;
  province: string;
  city: string;
  bodyCondition: string;
  paintParts: number;
  severeAccident: boolean;
  imageCount: number;
  descriptionLength: number;
};

export type MarketFloorScore = {
  score: number;
  grade: "excellent" | "good" | "review" | "rejected";
  decision: "approved" | "rejected" | "human_review";
  reason: string;
  components: Record<string, number>;
  discountPercent: number;
};

export function marketFloorWindow(now = new Date()) {
  const startsAt = new Date(now);
  const endsAt = new Date(startsAt.getTime() + MARKET_FLOOR_DURATION_HOURS * 60 * 60 * 1000);
  return {
    key: `rolling-${startsAt.getTime()}`,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function evaluateMarketFloor(listing: MarketFloorListing): MarketFloorScore {
  const hasComparable = listing.marketReferenceToman > 0 && listing.priceToman > 0;
  const discountPercent = hasComparable
    ? ((listing.marketReferenceToman - listing.priceToman) / listing.marketReferenceToman) * 100
    : 0;
  const price = hasComparable ? clamp(discountPercent * 4, 0, 40) : 0;
  const discount = hasComparable ? clamp(discountPercent * 2, 0, 20) : 0;
  const popularity = listing.brand && listing.model ? 10 : 4;
  const completeness = clamp(
    [listing.title, listing.brand, listing.model, listing.year, listing.province, listing.city].filter(Boolean).length * 1.3
      + (listing.descriptionLength >= 120 ? 2 : 0),
    0,
    10,
  );
  const quality = clamp(listing.imageCount * 2, 0, 10);
  let condition = listing.mileageKm > 250_000 ? 3 : listing.mileageKm > 160_000 ? 6 : 10;
  condition -= clamp(listing.paintParts * 2, 0, 6);
  if (listing.severeAccident) condition = 0;
  condition = clamp(condition, 0, 10);
  const components = { price, discount, popularity, completeness, quality, condition };
  const score = Object.values(components).reduce((sum, value) => sum + value, 0);

  if (!hasComparable) {
    return { score, grade: "review", decision: "human_review", discountPercent, components, reason: "داده کافی و قابل اتکا از قیمت خودروهای مشابه وجود ندارد؛ بررسی مدیر لازم است." };
  }
  if (listing.severeAccident || completeness < 7) {
    return { score, grade: "rejected", decision: "rejected", discountPercent, components, reason: `با وجود اختلاف قیمت ${discountPercent.toFixed(1)}٪، وضعیت بدنه یا کامل نبودن اطلاعات ریسک خرید را بالا می‌برد.` };
  }
  if (score >= 90) return { score, grade: "excellent", decision: "approved", discountPercent, components, reason: `قیمت حدود ${discountPercent.toFixed(1)}٪ پایین‌تر از نمونه‌های مشابه، اطلاعات کامل و شرایط مناسب است.` };
  if (score >= MARKET_FLOOR_MIN_SCORE) return { score, grade: "good", decision: "approved", discountPercent, components, reason: `آگهی با امتیاز ${score} شرایط لازم برای کف بازار را دارد.` };
  if (score >= 70) return { score, grade: "review", decision: "human_review", discountPercent, components, reason: `امتیاز ${score} مرزی است و برای جلوگیری از تأیید اشتباه باید مدیر بررسی کند.` };
  return { score, grade: "rejected", decision: "rejected", discountPercent, components, reason: `آگهی با امتیاز ${score} حداقل کیفیت و جذابیت لازم برای کف بازار را ندارد.` };
}
