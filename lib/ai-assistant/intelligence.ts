import type {
  AdminListingContext,
  AdminOperationalInsights,
  AssistantPageContext,
  MarketIntelligence,
  PublicListingContext,
  PublicSearchIntent,
} from "./contracts";

const IRAN_PROVINCES = [
  "آذربایجان شرقی",
  "آذربایجان غربی",
  "اردبیل",
  "اصفهان",
  "البرز",
  "ایلام",
  "بوشهر",
  "تهران",
  "چهارمحال و بختیاری",
  "خراسان جنوبی",
  "خراسان رضوی",
  "خراسان شمالی",
  "خوزستان",
  "زنجان",
  "سمنان",
  "سیستان و بلوچستان",
  "فارس",
  "قزوین",
  "قم",
  "کردستان",
  "کرمان",
  "کرمانشاه",
  "کهگیلویه و بویراحمد",
  "گلستان",
  "گیلان",
  "لرستان",
  "مازندران",
  "مرکزی",
  "هرمزگان",
  "همدان",
  "یزد",
] as const;

const VEHICLE_BRANDS = [
  "ایران خودرو",
  "مدیران خودرو",
  "کرمان موتور",
  "فونیکس",
  "لاماری",
  "فردا",
  "بهمن",
  "پژو",
  "سمند",
  "دنا",
  "تارا",
  "رانا",
  "ری را",
  "سایپا",
  "پراید",
  "تیبا",
  "شاهین",
  "کوییک",
  "اطلس",
  "چانگان",
  "جک",
  "کی ام سی",
  "ام وی ام",
  "چری",
  "آریزو",
  "تیگو",
  "هایما",
  "فیدلیتی",
  "دیگنیتی",
  "مزدا",
  "تویوتا",
  "لکسوس",
  "هیوندای",
  "کیا",
  "نیسان",
  "میتسوبیشی",
  "رنو",
  "سیتروئن",
  "فولکس واگن",
  "بنز",
  "مرسدس بنز",
  "بی ام و",
  "پورشه",
  "ولوو",
  "سوزوکی",
  "هوندا",
  "فورد",
  "شورولت",
] as const;

type MoneyRange = {
  min: number | null;
  max: number | null;
};

export function parsePublicSearchIntent(
  message: string,
  page: AssistantPageContext,
): PublicSearchIntent {
  const normalized = normalizeText(message);
  const money = extractMoneyRange(normalized);
  const province =
    findIncluded(normalized, IRAN_PROVINCES) || page.locationProvince || "";
  const city =
    (page.locationCities || []).find((item) =>
      normalized.includes(normalizeText(item)),
    ) || "";
  const brand = findIncluded(normalized, VEHICLE_BRANDS);
  const years = extractYears(normalized);

  return {
    q: extractUsefulQuery(normalized, brand),
    province,
    city,
    brand,
    model: "",
    min_price: money.min,
    max_price: money.max,
    min_year: years.min,
    max_year: years.max,
    max_mileage: extractMileage(normalized),
    transmission: normalized.includes("اتومات")
      ? "automatic"
      : normalized.includes("دنده") || normalized.includes("دستی")
        ? "manual"
        : "",
    fuel_type: normalized.includes("هیبرید")
      ? "hybrid"
      : normalized.includes("برقی")
        ? "electric"
        : normalized.includes("دیزل")
          ? "diesel"
          : normalized.includes("بنزین")
            ? "gasoline"
            : "",
    seller_type:
      normalized.includes("نمایشگاه") || normalized.includes("فروشنده حرفه")
        ? "dealer"
        : normalized.includes("شخصی")
          ? "personal"
          : "",
    sort:
      normalized.includes("ارزان") || normalized.includes("کمترین قیمت")
        ? "price_asc"
        : normalized.includes("گران") || normalized.includes("بیشترین قیمت")
          ? "price_desc"
          : normalized.includes("جدیدترین")
            ? "newest"
            : "vip",
    relaxed: false,
  };
}

export function buildMarketIntelligence(
  listings: PublicListingContext[],
  detail: Record<string, unknown> | null,
  maxBudget: number | null,
): MarketIntelligence {
  const prices = listings
    .map((item) => item.price_toman)
    .filter((value): value is number => typeof value === "number" && value > 0)
    .sort((a, b) => a - b);
  const median = medianNumber(prices);
  const detailPrice = finiteNumber(detail?.price_toman);
  const position =
    !detailPrice || !median
      ? "unknown"
      : detailPrice < median * 0.88
        ? "below_market"
        : detailPrice > median * 1.12
          ? "above_market"
          : "near_market";

  return {
    sample_size: listings.length,
    priced_sample_size: prices.length,
    median_price_toman: median,
    min_price_toman: prices.at(0) ?? null,
    max_price_toman: prices.at(-1) ?? null,
    affordable_count: maxBudget
      ? prices.filter((price) => price <= maxBudget).length
      : 0,
    current_listing_position: position,
  };
}

export function enrichAdminQueue(
  listings: AdminListingContext[],
): AdminListingContext[] {
  return listings
    .map((listing) => {
      const priority = calculateAdminPriority(listing);
      return {
        ...listing,
        priority_score: priority.score,
        priority_reasons: priority.reasons,
      };
    })
    .sort((a, b) => b.priority_score - a.priority_score);
}

export function buildAdminOperationalInsights(
  listings: AdminListingContext[],
  stats: Record<string, number>,
): AdminOperationalInsights {
  const riskCounts = countBy(listings, (item) => item.risk_level || "unknown");
  const ownerTypeCounts = countBy(
    listings,
    (item) => item.owner_type || "unknown",
  );
  const fresh = listings.filter(
    (item) => item.age_days !== null && item.age_days < 1,
  ).length;
  const waiting = listings.filter(
    (item) =>
      item.age_days !== null && item.age_days >= 1 && item.age_days < 3,
  ).length;
  const stale = listings.filter(
    (item) => item.age_days !== null && item.age_days >= 3,
  ).length;
  const critical =
    (riskCounts.critical || 0) + (riskCounts.high || 0);
  const needsEdit = Math.max(
    stats.needs_edit || 0,
    listings.filter((item) => item.status === "needs_edit").length,
  );
  const denominator = Math.max(1, listings.length);
  const workloadScore = Math.min(
    100,
    Math.round(
      ((critical * 2.5 + stale * 1.5 + waiting * 0.5 + needsEdit * 0.5) /
        denominator) *
        30,
    ),
  );

  return {
    risk_counts: riskCounts,
    age_buckets: { fresh, waiting, stale },
    owner_type_counts: ownerTypeCounts,
    critical_total: critical,
    stale_total: stale,
    needs_edit_total: needsEdit,
    workload_score: workloadScore,
  };
}

function calculateAdminPriority(item: AdminListingContext) {
  const reasons: string[] = [];
  const riskWeight: Record<string, number> = {
    critical: 560,
    high: 390,
    medium: 210,
    low: 55,
  };
  let score = riskWeight[item.risk_level] || 0;

  if (item.risk_level === "critical" || item.risk_level === "high") {
    reasons.push("ریسک بالا");
  }
  if ((item.risk_score || 0) >= 70) {
    score += 90;
    reasons.push("امتیاز ریسک بالا");
  }
  if ((item.age_days || 0) >= 3) {
    score += 150 + Math.min(item.age_days || 0, 30);
    reasons.push("بیش از ۳ روز در صف");
  } else if ((item.age_days || 0) >= 1) {
    score += 55;
    reasons.push("در انتظار پیگیری");
  }
  if (item.status === "needs_edit") {
    score += 80;
    reasons.push("نیازمند اصلاح");
  }
  if (!item.moderation_reason && item.moderation_status) {
    score += 25;
    reasons.push("دلیل بررسی ناقص");
  }

  return {
    score: score + Math.min(item.risk_score || 0, 100),
    reasons: reasons.slice(0, 3),
  };
}

function extractMoneyRange(value: string): MoneyRange {
  const sharedUnitRange = value.match(
    /(?:^|\s)(?:بین|از)\s*(\d+(?:[.,]\d+)?)\s*(میلیارد|میلیون)?\s*(?:تا|-)\s*(\d+(?:[.,]\d+)?)\s*(میلیارد|میلیون)/,
  );

  if (sharedUnitRange) {
    const firstUnit = sharedUnitRange[2] || sharedUnitRange[4];
    const first = moneyAmount(sharedUnitRange[1], firstUnit);
    const second = moneyAmount(sharedUnitRange[3], sharedUnitRange[4]);
    if (first && second) {
      return {
        min: Math.min(first, second),
        max: Math.max(first, second),
      };
    }
  }

  const amounts = Array.from(
    value.matchAll(
      /(\d+(?:[.,]\d+)?)\s*(میلیارد|میلیون)\s*(?:تومان)?/g,
    ),
  )
    .map((match) => {
      const number = Number(match[1].replace(",", "."));
      const multiplier =
        match[2] === "میلیارد" ? 1_000_000_000 : 1_000_000;
      return Number.isFinite(number) ? Math.round(number * multiplier) : 0;
    })
    .filter((amount) => amount > 0);

  if (!amounts.length) return { min: null, max: null };

  const rangeLanguage =
    /(?:^|\s)(بین|از)(?:\s|$)/.test(value) && amounts.length >= 2;
  if (rangeLanguage) {
    return {
      min: Math.min(...amounts),
      max: Math.max(...amounts),
    };
  }

  const amount = Math.max(...amounts);
  const isMinimum = /(حداقل|بیشتر از|بالای)/.test(value);
  return isMinimum ? { min: amount, max: null } : { min: null, max: amount };
}

function moneyAmount(value: string, unit: string) {
  const number = Number(value.replace(",", "."));
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.round(
    number * (unit === "میلیارد" ? 1_000_000_000 : 1_000_000),
  );
}

function extractYears(value: string) {
  const years = Array.from(value.matchAll(/\b(13\d{2}|14\d{2}|20\d{2})\b/g))
    .map((match) => Number(match[1]))
    .filter((year) => year >= 1300 && year <= 2100);

  if (!years.length) return { min: null, max: null };
  if (
    years.length >= 2 &&
    /(?:^|\s)(بین|از)(?:\s|$)/.test(value)
  ) {
    return { min: Math.min(...years), max: Math.max(...years) };
  }

  const year = years[0];
  return /(حداکثر|قدیمی|قبل)/.test(value)
    ? { min: null, max: year }
    : { min: year, max: null };
}

function extractMileage(value: string) {
  const match = value.match(
    /(?:زیر|کمتر از|حداکثر|تا)?\s*(\d+(?:[.,]\d+)?)\s*(هزار)?\s*(?:کیلومتر|کارکرد|تا کار|کار)/,
  );
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * (match[2] ? 1_000 : 1));
}

function extractUsefulQuery(value: string, brand: string) {
  if (!brand) return "";
  const afterBrand = value.split(normalizeText(brand))[1] || "";
  const candidate = afterBrand
    .replace(
      /(مدل|سال|اتومات(?:یک)?|دنده(?:ای)?|دستی|بنزینی?|هیبرید|برقی|دیزل|تا|زیر|بالای|میلیارد|میلیون|تومان).*/g,
      "",
    )
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ");
  return candidate.length >= 2 ? candidate : "";
}

function findIncluded(value: string, choices: readonly string[]) {
  return (
    [...choices]
      .sort((a, b) => b.length - a.length)
      .find((choice) => value.includes(normalizeText(choice))) || ""
  );
}

function countBy<T>(values: T[], selector: (value: T) => string) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = selector(value);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function medianNumber(values: number[]) {
  if (!values.length) return null;
  const middle = Math.floor(values.length / 2);
  return values.length % 2
    ? values[middle]
    : Math.round((values[middle - 1] + values[middle]) / 2);
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function normalizeAssistantText(value: string) {
  return normalizeText(value);
}

function normalizeText(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/٬/g, ",")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
