"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./SaveCurrentSearchButton.module.css";

export const SAVED_SEARCHES_KEY = "chakod_saved_car_searches";
const MAX_SAVED = 20;

export type SavedCarSearch = {
  id: string;
  name: string;
  href: string;
  createdAt: string;
};

export function readSavedCarSearches() {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SAVED_SEARCHES_KEY) || "[]");
    if (!Array.isArray(parsed)) return [] as SavedCarSearch[];
    return parsed
      .filter((item): item is SavedCarSearch => Boolean(
        item &&
        typeof item === "object" &&
        typeof (item as SavedCarSearch).id === "string" &&
        typeof (item as SavedCarSearch).name === "string" &&
        typeof (item as SavedCarSearch).href === "string",
      ))
      .slice(0, MAX_SAVED);
  } catch {
    return [] as SavedCarSearch[];
  }
}

export function writeSavedCarSearches(items: SavedCarSearch[]) {
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(items.slice(0, MAX_SAVED)));
  window.dispatchEvent(new CustomEvent("chakod:saved-searches-change"));
}

function defaultName(params: URLSearchParams) {
  const brand = params.get("brand") || "";
  const model = params.get("model") || "";
  const province = params.get("province") || "";
  const parts = [brand, model, province].filter(Boolean);
  return parts.length ? parts.join(" - ") : "جست‌وجوی خودرو";
}

export default function SaveCurrentSearchButton() {
  const [ready, setReady] = useState(false);
  const [href, setHref] = useState("/cars");
  const [name, setName] = useState("جست‌وجوی خودرو");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const nextHref = `${window.location.pathname}${window.location.search}`;
    const params = new URLSearchParams(window.location.search);
    setHref(nextHref);
    setName(defaultName(params));
    setSaved(readSavedCarSearches().some((item) => item.href === nextHref));
    setReady(true);
  }, []);

  const hasFilters = useMemo(() => {
    if (!ready) return false;
    const params = new URLSearchParams(href.split("?")[1] || "");
    return Array.from(params.keys()).some((key) => key !== "page");
  }, [href, ready]);

  function save() {
    const items = readSavedCarSearches();
    const cleanName = window.prompt("نام این جست‌وجو را وارد کنید:", name)?.trim();
    if (!cleanName) return;

    const existing = items.find((item) => item.href === href);
    const next: SavedCarSearch[] = existing
      ? items.map((item) => item.href === href ? { ...item, name: cleanName } : item)
      : [
          {
            id: crypto.randomUUID(),
            name: cleanName.slice(0, 80),
            href,
            createdAt: new Date().toISOString(),
          },
          ...items,
        ];

    writeSavedCarSearches(next);
    setName(cleanName.slice(0, 80));
    setSaved(true);
  }

  if (!ready) return null;

  return (
    <div className={styles.wrap} dir="rtl">
      <button type="button" className={saved ? styles.saved : ""} onClick={save}>
        <span aria-hidden="true">☆</span>
        {saved ? "جست‌وجو ذخیره شده" : hasFilters ? "ذخیره این جست‌وجو" : "ذخیره بازار فعلی"}
      </button>
      <Link href="/cars/saved-searches">جست‌وجوهای ذخیره‌شده</Link>
    </div>
  );
}
