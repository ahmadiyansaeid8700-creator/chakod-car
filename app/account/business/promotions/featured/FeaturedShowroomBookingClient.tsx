"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import MobileBottomNav from "../../../../components/MobileBottomNav";
import PersianDatePicker from "../../../../components/PersianDatePicker";
import styles from "./page.module.css";

type Dealer = {
  dealer_id: number;
  dealer_name: string;
  role?: string;
};

type Province = {
  province: string;
  is_large: boolean;
  banner_price_toman: number;
  banner_day_capacity: number;
  banner_is_active: boolean;
};

type Placement = {
  id: number;
  dealer_id: number;
  dealer_name: string;
  province: string;
  start_date: string;
  end_date: string;
  reserved_days: number;
  daily_rate_toman: number;
  total_price_toman: number;
  status: string;
  admin_note?: string;
  approved_at?: string | null;
  created_at: string;
};

type CommerceResponse = {
  success?: boolean;
  message?: string;
  dealers?: Dealer[];
  provinces?: Province[];
};

type PlacementResponse = {
  success?: boolean;
  message?: string;
  placements?: Placement[];
  order?: {
    order_no: string;
    amount_toman: number;
    status: string;
  };
  checkout_url?: string;
};

type DiscountQuote = {
  original_amount_toman: number;
  discount_amount_toman: number;
  final_amount_toman: number;
  code?: string | null;
  title?: string | null;
};

const statusLabels: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  paid: "پرداخت شده",
  pending_review: "در انتظار تایید",
  approved: "تایید شده",
  scheduled: "زمان بندی شده",
  active: "در حال نمایش",
  expired: "پایان یافته",
  rejected: "رد شده",
  cancelled: "لغو شده",
  refunded: "بازگشت وجه",
};

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function countDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value || 0))} تومان`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(Number(value || 0));
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? {
        Authorization: `Bearer ${token}`,
        "X-Session-Token": token,
      }
    : {};
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

export default function FeaturedShowroomBookingClient() {
  const [commerce, setCommerce] = useState<CommerceResponse | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [dealerId, setDealerId] = useState(0);
  const [province, setProvince] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountQuote, setDiscountQuote] = useState<DiscountQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const [error, setError] = useState("");
  const requestKeyRef = useRef("");

  async function load() {
    setLoading(true);
    setError("");

    const token = localStorage.getItem("chakod_session_token") || "";
    if (!token) {
      const returnTo = "/account/business/promotions/featured";
      window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    const headers = { Accept: "application/json", ...authHeaders() };
    const [commerceResult, placementResult] = await Promise.allSettled([
      fetch("/api/auth/commerce", {
        cache: "no-store",
        credentials: "include",
        headers,
      }),
      fetch("/api/finance/featured-showrooms", {
        cache: "no-store",
        credentials: "include",
        headers,
      }),
    ]);

    try {
      if (commerceResult.status !== "fulfilled") {
        setError("اطلاعات نمایشگاه و تعرفه دریافت نشد.");
        return;
      }

      const commercePayload = await readJson<CommerceResponse>(commerceResult.value);
      if (!commerceResult.value.ok || !commercePayload?.success) {
        setError(commercePayload?.message || "اطلاعات تجاری حساب دریافت نشد.");
        return;
      }

      setCommerce(commercePayload);
      const firstDealer = commercePayload.dealers?.[0];
      const firstProvince = commercePayload.provinces?.find((item) => item.banner_is_active);
      setDealerId((current) => current || firstDealer?.dealer_id || 0);
      setProvince((current) => current || firstProvince?.province || "");

      if (placementResult.status === "fulfilled") {
        const placementPayload = await readJson<PlacementResponse>(placementResult.value);
        if (placementResult.value.ok && placementPayload?.success) {
          setPlacements(Array.isArray(placementPayload.placements) ? placementPayload.placements : []);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    requestKeyRef.current = crypto.randomUUID();
    void load();
  }, []);

  const selectedDealer = useMemo(
    () => commerce?.dealers?.find((item) => item.dealer_id === dealerId) || null,
    [commerce?.dealers, dealerId],
  );
  const selectedProvince = useMemo(
    () => commerce?.provinces?.find((item) => item.province === province) || null,
    [commerce?.provinces, province],
  );
  const days = useMemo(() => countDays(startDate, endDate), [startDate, endDate]);
  const baseTotal = Number(selectedProvince?.banner_price_toman || 0) * days;
  const finalTotal = discountQuote?.final_amount_toman ?? baseTotal;

  useEffect(() => {
    setDiscountQuote(null);
    requestKeyRef.current = crypto.randomUUID();
  }, [dealerId, province, startDate, endDate]);

  async function validateDiscount() {
    if (!discountCode.trim() || !selectedProvince || baseTotal <= 0) return;
    setCheckingDiscount(true);
    setError("");

    try {
      const response = await fetch("/api/auth/commerce", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          action: "validate_discount",
          discount_code: discountCode.trim(),
          service_key: selectedProvince.is_large ? "home_banner_large" : "home_banner_regular",
          amount_toman: baseTotal,
          province,
        }),
      });
      const payload = await readJson<{
        success?: boolean;
        message?: string;
        discount?: DiscountQuote;
      }>(response);

      if (!response.ok || !payload?.success || !payload.discount) {
        setDiscountQuote(null);
        setError(payload?.message || "کد تخفیف معتبر نیست.");
        return;
      }
      setDiscountQuote(payload.discount);
    } catch {
      setDiscountQuote(null);
      setError("بررسی کد تخفیف انجام نشد.");
    } finally {
      setCheckingDiscount(false);
    }
  }

  async function reserve() {
    setError("");

    if (!dealerId || !province || !startDate || !endDate || days <= 0) {
      setError("نمایشگاه، استان و بازه زمانی را کامل کنید.");
      return;
    }

    setWorking(true);
    try {
      const idempotencyKey = requestKeyRef.current || crypto.randomUUID();
      requestKeyRef.current = idempotencyKey;

      const response = await fetch("/api/finance/featured-showrooms", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          dealer_id: dealerId,
          province,
          start_date: startDate,
          end_date: endDate,
          discount_code: discountCode.trim() || undefined,
          idempotency_key: idempotencyKey,
        }),
      });
      const payload = await readJson<PlacementResponse>(response);

      if (!response.ok || !payload?.success || !payload.order?.order_no) {
        setError(payload?.message || "رزرو جایگاه نمایشگاه منتخب انجام نشد.");
        return;
      }

      const checkoutUrl = payload.checkout_url ||
        `/account/payments/checkout/order/${encodeURIComponent(payload.order.order_no)}`;
      window.location.assign(checkoutUrl);
    } catch {
      setError("ارتباط با سرویس رزرو برقرار نشد.");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.page} dir="rtl">
        <section className={styles.stateCard}>
          <span className={styles.loader} />
          <h1>در حال آماده سازی جایگاه نمایشگاه منتخب</h1>
          <p>نمایشگاه ها، استان ها، ظرفیت و تعرفه در حال دریافت هستند.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Link href="/account/business/promotions" className={styles.back}>← تبلیغات کسب و کار</Link>
            <span>نمایشگاه های منتخب صفحه اول</span>
            <h1>رزرو جایگاه نمایشگاه منتخب</h1>
            <p>همان فرایند رزرو قبلی، اما به جای بنر، خود نمایشگاه و خودروهای فعالش در ریل منتخب نمایش داده می شوند.</p>
          </div>
          <Link href="/account/business" className={styles.commandLink}>مرکز فرمان نمایشگاه</Link>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        {!commerce?.dealers?.length ? (
          <section className={styles.stateCard}>
            <h2>نمایشگاه قابل مدیریت پیدا نشد</h2>
            <p>برای رزرو این جایگاه ابتدا باید نمایشگاه تایید شده در حساب داشته باشید.</p>
            <Link href="/account/business/new">ثبت نمایشگاه</Link>
          </section>
        ) : (
          <>
            <section className={styles.bookingGrid}>
              <div className={styles.formPanel}>
                <div className={styles.stepHeader}>
                  <b>۱</b>
                  <div>
                    <h2>نمایشگاه و محدوده نمایش</h2>
                    <p>کارت منتخب فقط برای محدوده رزرو شده اولویت می گیرد.</p>
                  </div>
                </div>

                <div className={styles.twoCols}>
                  <label>
                    نمایشگاه
                    <select value={dealerId} onChange={(event) => setDealerId(Number(event.target.value))}>
                      {commerce.dealers.map((dealer) => (
                        <option key={dealer.dealer_id} value={dealer.dealer_id}>{dealer.dealer_name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    استان
                    <select value={province} onChange={(event) => setProvince(event.target.value)}>
                      {(commerce.provinces || []).filter((item) => item.banner_is_active).map((item) => (
                        <option key={item.province} value={item.province}>
                          {item.province}{item.is_large ? " — استان بزرگ" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className={styles.twoCols}>
                  <label>
                    تاریخ شروع
                    <PersianDatePicker
                      min={localDateValue()}
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="انتخاب تاریخ شروع"
                    />
                  </label>
                  <label>
                    تاریخ پایان
                    <PersianDatePicker
                      min={startDate || localDateValue()}
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="انتخاب تاریخ پایان"
                    />
                  </label>
                </div>

                <div className={styles.stepHeader}>
                  <b>۲</b>
                  <div>
                    <h2>تخفیف و پرداخت</h2>
                    <p>بعد از ثبت رزرو، سفارش وارد Checkout واحد چاکود می شود.</p>
                  </div>
                </div>

                <div className={styles.discountRow}>
                  <input
                    value={discountCode}
                    onChange={(event) => setDiscountCode(event.target.value)}
                    placeholder="کد تخفیف"
                    maxLength={80}
                  />
                  <button type="button" disabled={checkingDiscount || !discountCode.trim()} onClick={() => void validateDiscount()}>
                    {checkingDiscount ? "در حال بررسی" : "اعمال کد"}
                  </button>
                </div>

                <div className={styles.autoCardNote}>
                  <span>✓</span>
                  <div>
                    <strong>نیازی به آپلود بنر نیست</strong>
                    <p>لوگو، نام نمایشگاه و خودروهای فعال مستقیما از پروفایل و آگهی های همان نمایشگاه داخل کارت منتخب نمایش داده می شوند.</p>
                  </div>
                </div>
              </div>

              <aside className={styles.summaryCard}>
                <span>خلاصه رزرو</span>
                <div><small>نمایشگاه</small><strong>{selectedDealer?.dealer_name || "—"}</strong></div>
                <div><small>استان</small><strong>{province || "—"}</strong></div>
                <div><small>تعداد روز</small><strong>{formatNumber(days)}</strong></div>
                <div><small>ظرفیت روزانه</small><strong>{formatNumber(Number(selectedProvince?.banner_day_capacity || 0))}</strong></div>
                <div><small>تعرفه روزانه</small><strong>{formatToman(Number(selectedProvince?.banner_price_toman || 0))}</strong></div>
                {discountQuote && (
                  <div><small>تخفیف</small><strong>− {formatToman(discountQuote.discount_amount_toman)}</strong></div>
                )}
                <hr />
                <div className={styles.total}><small>مبلغ نهایی</small><strong>{formatToman(finalTotal)}</strong></div>
                <button type="button" disabled={working || finalTotal <= 0} onClick={() => void reserve()}>
                  {working ? "در حال ثبت رزرو..." : "ثبت رزرو و ادامه پرداخت"}
                </button>
              </aside>
            </section>

            <section className={styles.history}>
              <header>
                <span>سوابق جایگاه</span>
                <h2>رزروهای نمایشگاه منتخب</h2>
              </header>
              {placements.length ? (
                <div className={styles.historyList}>
                  {placements.map((item) => (
                    <article key={item.id}>
                      <div>
                        <strong>{item.dealer_name}</strong>
                        <small>{item.province} · {item.start_date} تا {item.end_date}</small>
                      </div>
                      <div>
                        <b>{statusLabels[item.status] || item.status}</b>
                        <small>{formatToman(item.total_price_toman)}</small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>هنوز رزروی برای نمایشگاه منتخب ثبت نشده است.</p>
              )}
            </section>
          </>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
