"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./PersianDatePicker.module.css";

type Props = {
  value?: string | null;
  onChange: (value: string) => void;
  includeTime?: boolean;
  min?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

type JalaliDate = { jy: number; jm: number; jd: number };
type GregorianDate = { gy: number; gm: number; gd: number };

const monthNames = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const weekDays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

function div(a: number, b: number) {
  return Math.trunc(a / b);
}

function mod(a: number, b: number) {
  return a - Math.trunc(a / b) * b;
}

function jalCal(jy: number) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jump = 0;

  if (jy < jp || jy >= breaks[bl - 1]) {
    throw new Error("سال شمسی خارج از محدوده است.");
  }

  for (let i = 1; i < bl; i += 1) {
    const jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): GregorianDate {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): JalaliDate {
  const g = d2g(jdn);
  let jy = g.gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(g.gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }

  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

function toJalali(gy: number, gm: number, gd: number) {
  return d2j(g2d(gy, gm, gd));
}

function toGregorian(jy: number, jm: number, jd: number) {
  return d2g(j2d(jy, jm, jd));
}

function isLeapJalaliYear(jy: number) {
  return jalCal(jy).leap === 0;
}

function monthLength(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaliYear(jy) ? 30 : 29;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toPersianDigits(value: string | number) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function parseValue(value?: string | null) {
  if (!value) return null;
  const normalized = value.replace(" ", "T");
  const [datePart, timePart = ""] = normalized.split("T");
  const [gy, gm, gd] = datePart.split("-").map(Number);
  if (!gy || !gm || !gd) return null;
  const [hour = 0, minute = 0] = timePart.split(":").map(Number);
  return { ...toJalali(gy, gm, gd), hour: Number.isFinite(hour) ? hour : 0, minute: Number.isFinite(minute) ? minute : 0 };
}

function formatValue(jy: number, jm: number, jd: number, hour: number, minute: number, includeTime: boolean) {
  const g = toGregorian(jy, jm, jd);
  const date = `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`;
  return includeTime ? `${date}T${pad(hour)}:${pad(minute)}` : date;
}

function dateOnly(value?: string | null) {
  return (value || "").replace(" ", "T").slice(0, 10);
}

export function formatPersianDate(value?: string | null, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export default function PersianDatePicker({
  value,
  onChange,
  includeTime = false,
  min,
  disabled = false,
  placeholder = "انتخاب تاریخ",
  className = "",
}: Props) {
  const parsed = useMemo(() => parseValue(value), [value]);
  const todayGregorian = new Date();
  const today = toJalali(todayGregorian.getFullYear(), todayGregorian.getMonth() + 1, todayGregorian.getDate());
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.jy || today.jy);
  const [viewMonth, setViewMonth] = useState(parsed?.jm || today.jm);
  const [selectedDay, setSelectedDay] = useState(parsed?.jd || today.jd);
  const [hour, setHour] = useState(parsed?.hour || 0);
  const [minute, setMinute] = useState(parsed?.minute || 0);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, right: 0 });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!parsed) return;
    setViewYear(parsed.jy);
    setViewMonth(parsed.jm);
    setSelectedDay(parsed.jd);
    setHour(parsed.hour);
    setMinute(parsed.minute);
  }, [parsed?.jy, parsed?.jm, parsed?.jd, parsed?.hour, parsed?.minute]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    function positionPopover() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const estimatedHeight = includeTime ? 430 : 370;
      const top = window.innerHeight - rect.bottom > estimatedHeight
        ? rect.bottom + 8
        : Math.max(12, rect.top - estimatedHeight - 8);
      setPopoverPosition({ top, right: Math.max(12, window.innerWidth - rect.right) });
    }
    positionPopover();
    window.addEventListener("resize", positionPopover);
    window.addEventListener("scroll", positionPopover, true);
    return () => {
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
    };
  }, [open, includeTime]);

  const firstGregorian = toGregorian(viewYear, viewMonth, 1);
  const firstWeekDay = (new Date(firstGregorian.gy, firstGregorian.gm - 1, firstGregorian.gd).getDay() + 1) % 7;
  const daysInMonth = monthLength(viewYear, viewMonth);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekDay + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  function moveMonth(offset: number) {
    let nextMonth = viewMonth + offset;
    let nextYear = viewYear;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    setViewMonth(nextMonth);
    setViewYear(nextYear);
    setSelectedDay((current) => Math.min(current, monthLength(nextYear, nextMonth)));
  }

  function isBeforeMin(day: number) {
    if (!min) return false;
    const candidate = dateOnly(formatValue(viewYear, viewMonth, day, hour, minute, false));
    return candidate < dateOnly(min);
  }

  function selectDay(day: number) {
    if (isBeforeMin(day)) return;
    setSelectedDay(day);
    if (!includeTime) {
      onChange(formatValue(viewYear, viewMonth, day, hour, minute, false));
      setOpen(false);
    }
  }

  function apply() {
    onChange(formatValue(viewYear, viewMonth, selectedDay, hour, minute, includeTime));
    setOpen(false);
  }

  function selectToday() {
    setViewYear(today.jy);
    setViewMonth(today.jm);
    setSelectedDay(today.jd);
    if (!includeTime) {
      onChange(formatValue(today.jy, today.jm, today.jd, hour, minute, false));
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`${styles.root} ${className}`}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value ? formatPersianDate(value, includeTime) : placeholder}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v3M17 2v3M3.5 9.5h17M5.5 4.5h13a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z"/></svg>
      </button>

      {open && !disabled && (
        <div className={styles.popover} style={{ top: popoverPosition.top, right: popoverPosition.right }} role="dialog" aria-label="تقویم شمسی">
          <div className={styles.header}>
            <button type="button" onClick={() => moveMonth(1)} aria-label="ماه بعد">‹</button>
            <strong>{monthNames[viewMonth - 1]} {toPersianDigits(viewYear)}</strong>
            <button type="button" onClick={() => moveMonth(-1)} aria-label="ماه قبل">›</button>
          </div>

          <div className={styles.week}>{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
          <div className={styles.grid}>
            {cells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />;
              const selected = parsed?.jy === viewYear && parsed?.jm === viewMonth && parsed?.jd === day;
              const draftSelected = selectedDay === day;
              const current = today.jy === viewYear && today.jm === viewMonth && today.jd === day;
              const blocked = isBeforeMin(day);
              return (
                <button
                  type="button"
                  key={day}
                  disabled={blocked}
                  className={`${selected || draftSelected ? styles.selected : ""} ${current ? styles.today : ""}`}
                  onClick={() => selectDay(day)}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>

          {includeTime && (
            <div className={styles.timeRow}>
              <label>ساعت<input type="number" min={0} max={23} value={hour} onChange={(event) => setHour(Math.max(0, Math.min(23, Number(event.target.value))))}/></label>
              <span>:</span>
              <label>دقیقه<input type="number" min={0} max={59} value={minute} onChange={(event) => setMinute(Math.max(0, Math.min(59, Number(event.target.value))))}/></label>
            </div>
          )}

          <div className={styles.footer}>
            <button type="button" className={styles.light} onClick={() => { onChange(""); setOpen(false); }}>پاک‌کردن</button>
            <button type="button" className={styles.light} onClick={selectToday}>امروز</button>
            {includeTime && <button type="button" className={styles.primary} onClick={apply}>تأیید</button>}
          </div>
        </div>
      )}
    </div>
  );
}
