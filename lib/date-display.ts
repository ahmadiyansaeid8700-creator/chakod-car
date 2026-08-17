function parseDate(value?: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toPersianDigits(value: string | number) {
  return String(value).replace(/[0-9]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] || digit);
}

export function formatDualDate(value?: string | Date | null, includeTime = false) {
  const date = parseDate(value);
  if (!date) return typeof value === "string" ? value : "—";

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  const timeOptions: Intl.DateTimeFormatOptions = includeTime
    ? { hour: "2-digit", minute: "2-digit" }
    : {};

  const jalali = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    ...dateOptions,
    ...timeOptions,
  }).format(date);
  const gregorian = new Intl.DateTimeFormat("en-CA-u-ca-gregory", {
    ...dateOptions,
    ...timeOptions,
    hour12: false,
  }).format(date);

  return `${jalali} / ${gregorian}`;
}

export function formatDualYear(value?: number | string | null) {
  const numeric = Math.round(Number(value || 0));
  if (!numeric) return "نامشخص";

  let jalali: number;
  let gregorian: number;

  if (numeric >= 1700) {
    gregorian = numeric;
    jalali = numeric - 621;
  } else if (numeric >= 1200) {
    jalali = numeric;
    gregorian = numeric + 621;
  } else {
    return toPersianDigits(numeric);
  }

  return `${toPersianDigits(jalali)} / ${gregorian}`;
}

export function formatDualYearFromDate(value?: string | Date | null) {
  const date = parseDate(value);
  if (!date) return "—";

  const jalali = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(date);
  const gregorian = new Intl.DateTimeFormat("en-US-u-ca-gregory", { year: "numeric" }).format(date);
  return `${jalali} / ${gregorian}`;
}
