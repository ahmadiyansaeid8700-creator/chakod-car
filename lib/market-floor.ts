export const MARKET_FLOOR_PROVINCE_CAPACITY = 10;
export const MARKET_FLOOR_INITIAL_CARDS = 3;
export const MARKET_FLOOR_MIN_SCORE = 80;

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

export function marketFloorCycle(now = new Date(), next = false) {
  const tehranMs = now.getTime() + 3.5 * 60 * 60 * 1000;
  const local = new Date(tehranMs);
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 8, 0, 0);
  let startsAtMs = startLocal - 3.5 * 60 * 60 * 1000;
  if (tehranMs < startLocal) startsAtMs -= 24 * 60 * 60 * 1000;
  if (next) startsAtMs += 24 * 60 * 60 * 1000;
  const startsAt = new Date(startsAtMs);
  const endsAt = new Date(startsAtMs + 24 * 60 * 60 * 1000);
  return {
    key: startsAt.toISOString().slice(0, 10),
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
