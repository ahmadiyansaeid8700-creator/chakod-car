const DISPLAY_TIME_ZONE = "Asia/Tehran";

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

function calendarParts(date: Date, calendar: "persian" | "gregory", includeTime: boolean) {
  const formatter = new Intl.DateTimeFormat(`en-US-u-ca-${calendar}`, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
    timeZone: DISPLAY_TIME_ZONE,
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const dateText = `${parts.year || ""}/${parts.month || ""}/${parts.day || ""}`;
  const timeText = includeTime ? ` ${parts.hour || ""}:${parts.minute || ""}` : "";
  return toPersianDigits(`${dateText}${timeText}`);
}

export function formatDualDate(value?: string | Date | null, includeTime = false) {
  const date = parseDate(value);
  if (!date) return typeof value === "string" ? value : "—";

  const jalali = calendarParts(date, "persian", includeTime);
  const gregorian = calendarParts(date, "gregory", includeTime);
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

  return `${toPersianDigits(jalali)} / ${toPersianDigits(gregorian)}`;
}

export function formatDualYearFromDate(value?: string | Date | null) {
  const date = parseDate(value);
  if (!date) return "—";

  const jalali = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    year: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
  const gregorian = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
    year: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
  return `${toPersianDigits(jalali)} / ${toPersianDigits(gregorian)}`;
}
