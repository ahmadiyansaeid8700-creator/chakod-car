export const BANNER_CITY_DAY_RATE = 1_000_000;

export const BANNER_CITIES = [
  "تهران",
  "کرج",
  "رشت",
  "ساری",
  "گرگان",
  "تبریز",
  "مشهد",
  "اصفهان",
  "شیراز",
  "اهواز",
  "منطقه آزاد انزلی",
  "منطقه آزاد ارس",
] as const;

export const BUSINESS_TYPES = {
  dealer: "نمایشگاه‌دار خودرو",
  parts: "فروشگاه لوازم یدکی",
  repair: "تعمیرکار یا تعمیرگاه",
} as const;

export type BusinessType = keyof typeof BUSINESS_TYPES;

export function countReservedDays(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function calculateBannerPrice(
  startDate: string,
  endDate: string,
  cityCount: number,
) {
  const days = countReservedDays(startDate, endDate);
  return {
    days,
    cityCount,
    total: days * cityCount * BANNER_CITY_DAY_RATE,
  };
}

export function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
}
