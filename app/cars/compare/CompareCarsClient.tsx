"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

const STORAGE_KEY = "chakod_compare_listing_ids";
const MAX_ITEMS = 3;

type CompareCar = {
  id: number;
  title: string;
  brand: string;
  model: string;
  trim: string;
  production_year: number | null;
  mileage_km: number | null;
  price_toman: number | null;
  price_is_negotiable: boolean;
  province: string;
  city: string;
  neighborhood: string;
  transmission: string;
  fuel_type: string;
  color: string;
  body_status: string;
  technical_condition: string;
  engine_condition: string;
  chassis_condition: string;
  engine_volume: string;
  plate_type: string;
  free_zone_name: string;
  category_name: string;
  seller_type: string;
  dealer_name: string;
  views_count: number;
  cover_image: string;
};

type CompareResponse = {
  success?: boolean;
  message?: string;
  data?: CompareCar[];
  missing_ids?: number[];
};

function normalizeIds(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isSafeInteger(value) && value > 0),
    ),
  ).slice(0, MAX_ITEMS);
}

function readStoredIds() {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? normalizeIds(parsed) : [];
  } catch {
    return [];
  }
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function formatNumber(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("fa-IR").format(value);
}

function formatPrice(car: CompareCar) {
  if (car.price_toman && car.price_toman > 0) {
    return `${new Intl.NumberFormat("fa-IR").format(car.price_toman)} تومان`;
  }
  return car.price_is_negotiable ? "توافقی" : "قیمت درج نشده";
}

function text(value: string) {
  return value?.trim() || "—";
}

export default function CompareCarsClient() {
  const [ids, setIds] = useState<number[]>([]);
  const [cars, setCars] = useState<CompareCar[]>([]);
  const [manualId, setManualId] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  function persist(next: number[]) {
    const normalized = normalizeIds(next);
    setIds(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    const url = normalized.length
      ? `/cars/compare?ids=${encodeURIComponent(normalized.join(","))}`
      : "/cars/compare";
    window.history.replaceState(null, "", url);
  }

  useEffect(() => {
    const queryIds = new URLSearchParams(window.location.search)
      .get("ids")
      ?.split(",") || [];
    const next = normalizeIds([...queryIds, ...readStoredIds()]);
    setIds(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!ids.length) {
      setCars([]);
      setError("");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetch(`/api/compare-listings?ids=${encodeURIComponent(ids.join(","))}`, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const payload = await readJson<CompareResponse>(response);
        if (!response.ok || !payload?.success || !Array.isArray(payload.data)) {
          throw new Error(payload?.message || "اطلاعات مقایسه دریافت نشد.");
        }
        setCars(payload.data);
        if (payload.missing_ids?.length) {
          const available = ids.filter((id) => !payload.missing_ids?.includes(id));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(available));
        }
      })
      .catch((fetchError: unknown) => {
        if ((fetchError as Error).name !== "AbortError") {
          setCars([]);
          setError(fetchError instanceof Error ? fetchError.message : "مقایسه خودروها انجام نشد.");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [ids, ready]);

  const rows = useMemo(
    () => [
      { label: "قیمت", value: (car: CompareCar) => formatPrice(car) },
      { label: "برند", value: (car: CompareCar) => text(car.brand) },
      { label: "مدل", value: (car: CompareCar) => text(car.model) },
      { label: "تیپ", value: (car: CompareCar) => text(car.trim) },
      { label: "سال ساخت", value: (car: CompareCar) => formatNumber(car.production_year) },
      { label: "کارکرد", value: (car: CompareCar) => car.mileage_km === null ? "—" : `${formatNumber(car.mileage_km)} کیلومتر` },
      { label: "گیربکس", value: (car: CompareCar) => text(car.transmission) },
      { label: "سوخت", value: (car: CompareCar) => text(car.fuel_type) },
      { label: "رنگ", value: (car: CompareCar) => text(car.color) },
      { label: "وضعیت بدنه", value: (car: CompareCar) => text(car.body_status) },
      { label: "وضعیت فنی", value: (car: CompareCar) => text(car.technical_condition) },
      { label: "موتور", value: (car: CompareCar) => text(car.engine_condition) },
      { label: "شاسی", value: (car: CompareCar) => text(car.chassis_condition) },
      { label: "حجم موتور", value: (car: CompareCar) => text(car.engine_volume) },
      { label: "نوع پلاک", value: (car: CompareCar) => text(car.plate_type) },
      { label: "منطقه آزاد", value: (car: CompareCar) => text(car.free_zone_name) },
      { label: "موقعیت", value: (car: CompareCar) => [car.province, car.city, car.neighborhood].filter(Boolean).join("، ") || "—" },
      { label: "فروشنده", value: (car: CompareCar) => car.dealer_name || (car.seller_type ? "فروشنده شخصی" : "—") },
    ],
    [],
  );

  function addManual() {
    const value = Number(manualId);
    if (!Number.isSafeInteger(value) || value <= 0) {
      setError("شناسه آگهی معتبر وارد کنید.");
      return;
    }
    if (ids.includes(value)) {
      setError("این خودرو قبلا در مقایسه قرار دارد.");
      return;
    }
    if (ids.length >= MAX_ITEMS) {
      setError("حداکثر سه خودرو را می توان همزمان مقایسه کرد.");
      return;
    }
    setError("");
    setManualId("");
    persist([...ids, value]);
  }

  function remove(id: number) {
    persist(ids.filter((item) => item !== id));
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <section className={styles.hero}>
          <span>CHAKOD COMPARE</span>
          <h1>مقایسه خودروها</h1>
          <p>تا سه آگهی خودرو را کنار هم قرار دهید و قیمت، کارکرد، مشخصات فنی، وضعیت بدنه و موقعیت را در یک جدول مقایسه کنید.</p>
          <div className={styles.heroActions}>
            <Link href="/cars">افزودن خودرو از بازار</Link>
            <Link href="/cars/price-guide">راهنمای قیمت بازار</Link>
          </div>
        </section>

        <section className={styles.addCard}>
          <div>
            <span>افزودن با شناسه آگهی</span>
            <h2>{new Intl.NumberFormat("fa-IR").format(ids.length)} از {new Intl.NumberFormat("fa-IR").format(MAX_ITEMS)} خودرو انتخاب شده</h2>
          </div>
          <div className={styles.addForm}>
            <input
              inputMode="numeric"
              value={manualId}
              onChange={(event) => setManualId(event.target.value.replace(/\D/g, ""))}
              onKeyDown={(event) => { if (event.key === "Enter") addManual(); }}
              placeholder="مثلا 1234"
            />
            <button type="button" disabled={ids.length >= MAX_ITEMS} onClick={addManual}>افزودن</button>
          </div>
        </section>

        {error && <div className={styles.error}>{error}</div>}

        {!ready || loading ? (
          <section className={styles.state}><span className={styles.loader}/><h2>در حال آماده سازی مقایسه</h2></section>
        ) : ids.length === 0 ? (
          <section className={styles.state}>
            <span>⇄</span>
            <h2>هنوز خودرویی برای مقایسه انتخاب نشده است</h2>
            <p>از صفحه هر آگهی روی افزودن به مقایسه بزنید یا شناسه آگهی را در بالا وارد کنید.</p>
            <Link href="/cars">مشاهده خودروها</Link>
          </section>
        ) : cars.length > 0 ? (
          <section className={styles.compareCard}>
            <div className={styles.tableScroller}>
              <div className={styles.compareTable} style={{ "--car-count": cars.length } as React.CSSProperties}>
                <div className={`${styles.cell} ${styles.labelHead}`}>خودرو</div>
                {cars.map((car) => (
                  <article className={`${styles.cell} ${styles.carHead}`} key={car.id}>
                    <div className={styles.imageWrap}>
                      {car.cover_image ? <img src={car.cover_image} alt={car.title} /> : <span>بدون تصویر</span>}
                    </div>
                    <h2>{car.title || [car.brand, car.model].filter(Boolean).join(" ") || `آگهی ${car.id}`}</h2>
                    <strong>{formatPrice(car)}</strong>
                    <div className={styles.carActions}>
                      <Link href={`/cars/${car.id}`}>مشاهده آگهی</Link>
                      <button type="button" onClick={() => remove(car.id)}>حذف</button>
                    </div>
                  </article>
                ))}

                {rows.map((row) => (
                  <div className={styles.rowGroup} key={row.label}>
                    <div className={`${styles.cell} ${styles.rowLabel}`}>{row.label}</div>
                    {cars.map((car) => <div className={`${styles.cell} ${styles.valueCell}`} key={`${row.label}-${car.id}`}>{row.value(car)}</div>)}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className={styles.note}>
          <strong>مقایسه آگهی ها جای کارشناسی خودرو نیست</strong>
          <p>اطلاعات توسط آگهی دهندگان ثبت شده اند. سلامت فنی، بدنه، مدارک و قیمت معامله را پیش از خرید مستقل بررسی کنید.</p>
        </section>
      </div>
    </main>
  );
}
