import type {
  ListingModerationInput,
  ListingRiskLevel,
  RuleFinding,
} from "./contracts";

export const POLICY_VERSION = "chakod-listing-policy-2026-07-26";
export const AUTO_APPROVE_CONFIDENCE = 0.88;

const CONTACT_PATTERN =
  /(?:09\d{9}|(?:\+?98|0098)\s?9\d{9}|t\.me\/|telegram|تلگرام|واتس(?:اپ|‌اپ)|whatsapp|instagram|اینستاگرام|کارت\s*به\s*کارت)/iu;

const ADVANCE_PAYMENT_PATTERN =
  /(?:بیعانه|پیش\s*پرداخت|رزرو\s*با\s*واریز|واریز\s*قبل\s*از\s*بازدید|پرداخت\s*قبل\s*از\s*بازدید)/iu;

const SUSPICIOUS_URGENCY_PATTERN =
  /(?:فقط\s*امروز|زیر\s*قیمت\s*فوری|فرصت\s*استثنایی|بدون\s*بازدید|تماس\s*نگیر|فقط\s*پیام)/iu;

function addFinding(
  findings: RuleFinding[],
  finding: RuleFinding,
) {
  if (!findings.some((item) => item.code === finding.code)) {
    findings.push(finding);
  }
}

export function inspectListingRules(
  listing: ListingModerationInput,
): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const combinedText = `${listing.title}\n${listing.description}`.trim();

  if (listing.title.trim().length < 5) {
    addFinding(findings, {
      code: "TITLE_TOO_SHORT",
      severity: "warning",
      title: "عنوان ناقص",
      detail: "عنوان آگهی برای انتشار خودکار اطلاعات کافی ندارد.",
    });
  }

  if (listing.description.trim().length < 20) {
    addFinding(findings, {
      code: "DESCRIPTION_TOO_SHORT",
      severity: "warning",
      title: "توضیحات ناکافی",
      detail: "توضیحات باید وضعیت واقعی مورد فروش را روشن‌تر بیان کند.",
    });
  }

  if (listing.image_urls.length === 0) {
    addFinding(findings, {
      code: "NO_IMAGE",
      severity: "block",
      title: "تصویر وجود ندارد",
      detail: "آگهی بدون تصویر نباید به‌صورت خودکار منتشر شود.",
    });
  } else if (listing.image_urls.length < 2) {
    addFinding(findings, {
      code: "LOW_IMAGE_COVERAGE",
      severity: "warning",
      title: "تصاویر کم",
      detail: "برای بررسی دقیق‌تر خودرو، فقط یک تصویر در دسترس است.",
    });
  }

  if (CONTACT_PATTERN.test(combinedText)) {
    addFinding(findings, {
      code: "OFF_PLATFORM_CONTACT",
      severity: "warning",
      title: "اطلاعات تماس داخل متن",
      detail:
        "شماره تماس، شبکه اجتماعی یا درخواست کارت‌به‌کارت داخل متن دیده شد.",
    });
  }

  if (ADVANCE_PAYMENT_PATTERN.test(combinedText)) {
    addFinding(findings, {
      code: "ADVANCE_PAYMENT_REQUEST",
      severity: "block",
      title: "درخواست پرداخت پیش از بازدید",
      detail:
        "عبارت مرتبط با بیعانه یا واریز پیش از بازدید نیازمند بررسی انسانی است.",
    });
  }

  if (SUSPICIOUS_URGENCY_PATTERN.test(combinedText)) {
    addFinding(findings, {
      code: "PRESSURE_LANGUAGE",
      severity: "warning",
      title: "فشار غیرعادی برای معامله",
      detail: "متن شامل عبارت‌های عجله‌آور یا محدودکننده ارتباط است.",
    });
  }

  if (
    listing.price_toman !== undefined &&
    listing.price_toman > 0 &&
    listing.price_toman < 10_000_000
  ) {
    addFinding(findings, {
      code: "PRICE_OUTLIER_LOW",
      severity: "warning",
      title: "قیمت بسیار پایین",
      detail:
        "قیمت واردشده برای آگهی خودرو غیرعادی است و باید با بازار و مدل تطبیق داده شود.",
    });
  }

  if (
    listing.production_year !== undefined &&
    !isPlausibleVehicleYear(listing.production_year)
  ) {
    addFinding(findings, {
      code: "YEAR_OUT_OF_RANGE",
      severity: "warning",
      title: "سال ساخت نامعتبر",
      detail: "سال ساخت خارج از بازه قابل‌قبول است.",
    });
  }

  if (
    listing.mileage_km !== undefined &&
    (listing.mileage_km < 0 || listing.mileage_km > 2_000_000)
  ) {
    addFinding(findings, {
      code: "MILEAGE_OUT_OF_RANGE",
      severity: "warning",
      title: "کارکرد نامعتبر",
      detail: "عدد کارکرد خودرو خارج از بازه قابل‌قبول است.",
    });
  }

  if (
    listing.duplicate_similarity !== undefined &&
    listing.duplicate_similarity >= 0.9
  ) {
    addFinding(findings, {
      code: "LIKELY_DUPLICATE",
      severity: "block",
      title: "احتمال آگهی تکراری",
      detail: "شباهت این آگهی با محتوای قبلی بسیار زیاد گزارش شده است.",
    });
  }

  return findings;
}

export function hasBlockingFinding(findings: RuleFinding[]) {
  return findings.some((finding) => finding.severity === "block");
}

export function hasMaterialFinding(findings: RuleFinding[]) {
  return findings.some(
    (finding) =>
      finding.severity === "block" || finding.severity === "warning",
  );
}

export function highestRisk(
  levels: ListingRiskLevel[],
): ListingRiskLevel {
  const rank: Record<ListingRiskLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };

  return levels.reduce<ListingRiskLevel>(
    (highest, current) =>
      rank[current] > rank[highest] ? current : highest,
    "low",
  );
}

function isPlausibleVehicleYear(year: number) {
  const currentGregorianYear = new Date().getUTCFullYear();
  const isGregorian = year >= 1950 && year <= currentGregorianYear + 1;
  const currentJalaliYear = currentGregorianYear - 621;
  const isJalali = year >= 1330 && year <= currentJalaliYear + 1;

  return isGregorian || isJalali;
}
