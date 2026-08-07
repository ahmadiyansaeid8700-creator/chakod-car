"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  readSavedCarSearches,
  writeSavedCarSearches,
  type SavedCarSearch,
} from "../SaveCurrentSearchButton";
import styles from "./page.module.css";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function filterSummary(href: string) {
  const query = href.split("?")[1] || "";
  const params = new URLSearchParams(query);
  const labels: string[] = [];
  const map: Record<string, string> = {
    brand: "برند",
    model: "مدل",
    province: "استان",
    city: "شهر",
    price_min: "حداقل قیمت",
    price_max: "حداکثر قیمت",
    year_min: "حداقل سال",
    year_max: "حداکثر سال",
    fuel_type: "سوخت",
    transmission: "گیربکس",
    seller_type: "فروشنده",
    plate_type: "پلاک",
  };

  params.forEach((value, key) => {
    if (key === "page" || !value) return;
    labels.push(`${map[key] || key}: ${value}`);
  });

  return labels.length ? labels.slice(0, 5).join(" · ") : "بازار خودرو بدون فیلتر اختصاصی";
}

export default function SavedSearchesClient() {
  const [items, setItems] = useState<SavedCarSearch[]>([]);
  const [ready, setReady] = useState(false);

  function refresh() {
    setItems(readSavedCarSearches());
  }

  useEffect(() => {
    refresh();
    setReady(true);
    const handler = () => refresh();
    window.addEventListener("chakod:saved-searches-change", handler);
    return () => window.removeEventListener("chakod:saved-searches-change", handler);
  }, []);

  function remove(id: string) {
    if (!window.confirm("این جست‌وجوی ذخیره‌شده حذف شود؟")) return;
    const next = items.filter((item) => item.id !== id);
    writeSavedCarSearches(next);
    setItems(next);
  }

  function rename(item: SavedCarSearch) {
    const name = window.prompt("نام جدید جست‌وجو:", item.name)?.trim();
    if (!name) return;
    const next = items.map((current) => current.id === item.id ? { ...current, name: name.slice(0, 80) } : current);
    writeSavedCarSearches(next);
    setItems(next);
  }

  function clearAll() {
    if (!items.length || !window.confirm("همه جست‌وجوهای ذخیره‌شده حذف شوند؟")) return;
    writeSavedCarSearches([]);
    setItems([]);
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <section className={styles.hero}>
          <span>CHAKOD SAVED SEARCHES</span>
          <h1>جست‌وجوهای ذخیره‌شده</h1>
          <p>فیلترهای بازار خودرو را ذخیره کنید و بعدا با همان شرایط دوباره نتیجه‌ها را باز کنید.</p>
          <div className={styles.heroActions}>
            <Link href="/cars">بازگشت به بازار خودرو</Link>
            <Link href="/cars/compare">مقایسه خودروها</Link>
          </div>
        </section>

        {!ready ? (
          <section className={styles.state}><span className={styles.loader}/><h2>در حال خواندن جست‌وجوها</h2></section>
        ) : items.length ? (
          <>
            <section className={styles.toolbar}>
              <div><span>تعداد ذخیره‌شده</span><strong>{new Intl.NumberFormat("fa-IR").format(items.length)}</strong></div>
              <button type="button" onClick={clearAll}>پاک کردن همه</button>
            </section>

            <section className={styles.list}>
              {items.map((item) => (
                <article key={item.id}>
                  <div className={styles.copy}>
                    <span>ذخیره شده در {formatDate(item.createdAt)}</span>
                    <h2>{item.name}</h2>
                    <p>{filterSummary(item.href)}</p>
                  </div>
                  <div className={styles.actions}>
                    <Link href={item.href}>باز کردن نتیجه ها</Link>
                    <button type="button" onClick={() => rename(item)}>تغییر نام</button>
                    <button className={styles.delete} type="button" onClick={() => remove(item.id)}>حذف</button>
                  </div>
                </article>
              ))}
            </section>
          </>
        ) : (
          <section className={styles.state}>
            <span>☆</span>
            <h2>هنوز جست‌وجویی ذخیره نشده است</h2>
            <p>در بازار خودرو فیلترها را تنظیم کنید و از دکمه ذخیره جست‌وجوی فعلی استفاده کنید.</p>
            <Link href="/cars">رفتن به بازار خودرو</Link>
          </section>
        )}

        <section className={styles.note}>
          <strong>نسخه لانچ</strong>
          <p>این بخش جست‌وجوها را روی همین مرورگر نگه می دارد. اعلان خودکار تغییر قیمت تا زمانی که سرویس زمان بندی و اعلان سروری آماده نشود فعال نمی شود.</p>
        </section>
      </div>
    </main>
  );
}
