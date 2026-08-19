"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./CompareListingButton.module.css";

const STORAGE_KEY = "chakod_compare_listing_ids";
const MAX_ITEMS = 3;

function readIds() {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed
          .map((value) => Number(value))
          .filter((value) => Number.isSafeInteger(value) && value > 0),
      ),
    ).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export default function CompareListingButton({ listingId }: { listingId: number }) {
  const [ids, setIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(readIds());
    setReady(true);
  }, []);

  const selected = ids.includes(listingId);
  const compareHref = useMemo(
    () => `/cars/compare?ids=${encodeURIComponent(ids.join(","))}`,
    [ids],
  );

  function write(next: number[]) {
    setIds(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("chakod:compare-change", { detail: next }));
  }

  function toggle() {
    if (selected) {
      write(ids.filter((id) => id !== listingId));
      return;
    }

    if (ids.length >= MAX_ITEMS) {
      const next = [...ids.slice(1), listingId];
      write(next);
      return;
    }

    write([...ids, listingId]);
  }

  if (!ready) return null;

  return (
    <div className={styles.wrap} dir="rtl">
      <button
        type="button"
        className={selected ? styles.selected : ""}
        onClick={toggle}
        aria-pressed={selected}
      >
        <span aria-hidden="true">⇄</span>
        {selected ? "در مقایسه" : "افزودن به مقایسه"}
      </button>
      {ids.length > 0 && (
        <Link href={compareHref}>
          مقایسه {new Intl.NumberFormat("fa-IR").format(ids.length)} خودرو
        </Link>
      )}
    </div>
  );
}
