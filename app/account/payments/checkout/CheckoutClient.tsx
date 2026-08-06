"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../../components/MobileBottomNav";
import styles from "./page.module.css";

type CheckoutSelection = {
  type: "wallet_charge" | "promotion" | "subscription";
  code: string;
  title: string;
  description: string;
  amount: number;
};

type CreatePaymentResponse = {
  success?: boolean;
  message?: string;
  payment_url?: string;
  authority?: string;
  order_id?: string | number;
};

const promotionProducts: Record<string, Omit<CheckoutSelection, "type" | "code">> = {
  boost: {
    title: "بالابر آگهی",
    description: "انتقال آگهی به ابتدای نتایج مرتبط",
    amount: 149_000,
  },
  featured: {
    title: "آگهی ویژه",
    description: "نمایش برجسته‌تر همراه نشان ویژه",
    amount: 349_000,
  },
  story: {
    title: "استوری منطقه‌ای",
    description: "نمایش استوری برای کاربران محدوده انتخابی",
    amount: 690_000,
  },
  banner: {
    title: "بنر صفحه اصلی",
    description: "مبلغ بنر براساس استان، تاریخ و ظرفیت محاسبه می‌شود.",
    amount: 0,
  },
};

const subscriptionPlans: Record<string, Omit<CheckoutSelection, "type" | "code">> = {
  professional: {
    title: "اشتراک حرفه‌ای",
    description: "فعال‌سازی امکانات حرفه‌ای کسب‌وکار برای یک ماه",
    amount: 1_490_000,
  },
  dealership: {
    title: "اشتراک نمایشگاه حرفه‌ای",
    description: "مدیریت تیم، موجودی خودرو و گزارش حرفه‌ای برای یک ماه",
    amount: 2_490_000,
  },
};

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
}

function normalizeAmount(value: string) {
  const normalized = value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9]/g, "");
  return Math.max(0, Number(normalized) || 0);
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

export default function CheckoutClient() {
  const [query, setQuery] = useState("");
  const [walletAmount, setWalletAmount] = useState("500000");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setQuery(window.location.search);
  }, []);

  const selection = useMemo<CheckoutSelection>(() => {
    const params = new URLSearchParams(query);
    const type = params.get("type") || "wallet_charge";

    if (type === "promotion") {
      const code = params.get("product") || "boost";
      const product = promotionProducts[code] || promotionProducts.boost;
      return { type: "promotion", code, ...product };
    }

    if (type === "subscription") {
      const code = params.get("plan") || "professional";
      const plan = subscriptionPlans[code] || subscriptionPlans.professional;
      return { type: "subscription", code, ...plan };
    }

    return {
      type: "wallet_charge",
      code: "wallet_charge",
      title: "افزایش موجودی کیف پول",
      description: "مبلغ دلخواه را برای شارژ کیف پول چاکود وارد کنید.",
      amount: normalizeAmount(walletAmount),
    };
  }, [query, walletAmount]);

  const requiresConfiguration = selection.type === "promotion" && selection.code === "banner";
  const amountLabel = requiresConfiguration ? "پس از انتخاب استان و تاریخ" : formatToman(selection.amount);

  async function startPayment() {
    setError("");

    if (requiresConfiguration) {
      window.location.assign("/account/ads");
      return;
    }

    if (selection.amount < 10_000) {
      setError("مبلغ پرداخت باید حداقل ۱۰ هزار تومان باشد.");
      return;
    }

    const token = localStorage.getItem("chakod_session_token") || "";
    if (!token) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          type: selection.type,
          code: selection.code,
          amount_toman: selection.type === "wallet_charge" ? selection.amount : undefined,
          callback_path: "/account/payments/callback",
        }),
      });

      const text = await response.text();
      let result: CreatePaymentResponse | null = null;
      try {
        result = text ? (JSON.parse(text) as CreatePaymentResponse) : null;
      } catch {
        result = null;
      }

      if (!response.ok || !result?.success || !result.payment_url) {
        setError(result?.message || "ساخت درخواست پرداخت انجام نشد. دوباره تلاش کنید.");
        return;
      }

      window.location.assign(result.payment_url);
    } catch {
      setError("ارتباط با سرویس پرداخت برقرار نشد. چند لحظه دیگر دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/account/payments">بازگشت به مرکز مالی</Link>
          <Link className={styles.brand} href="/">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        <section className={styles.checkoutGrid}>
          <div className={styles.checkoutCard}>
            <span className={styles.eyebrow}>تسویه حساب امن</span>
            <h1>{selection.title}</h1>
            <p>{selection.description}</p>

            {selection.type === "wallet_charge" && (
              <label className={styles.amountField}>
                <span>مبلغ افزایش موجودی</span>
                <div>
                  <input
                    inputMode="numeric"
                    value={walletAmount}
                    onChange={(event) => setWalletAmount(event.target.value)}
                    aria-label="مبلغ افزایش موجودی"
                  />
                  <b>تومان</b>
                </div>
                <small>حداقل مبلغ قابل پرداخت ۱۰٬۰۰۰ تومان است.</small>
              </label>
            )}

            {requiresConfiguration && (
              <div className={styles.securityNote}>
                <span>۱</span>
                <p>ابتدا استان، تاریخ، تصاویر و مقصد بنر را مشخص کنید؛ سپس پیش‌فاکتور واقعی ساخته می‌شود.</p>
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}

            <button
              className={styles.payButton}
              type="button"
              disabled={submitting}
              onClick={() => void startPayment()}
            >
              {submitting
                ? "در حال اتصال به درگاه..."
                : requiresConfiguration
                  ? "تکمیل اطلاعات بنر"
                  : `پرداخت ${formatToman(selection.amount)}`}
            </button>

            {!requiresConfiguration && (
              <div className={styles.securityNote}>
                <span>✓</span>
                <p>تراکنش فقط پس از بازگشت موفق از درگاه و تأیید سمت سرور نهایی می‌شود.</p>
              </div>
            )}
          </div>

          <aside className={styles.summaryCard}>
            <span>خلاصه سفارش</span>
            <div><small>عنوان</small><strong>{selection.title}</strong></div>
            <div>
              <small>نوع سفارش</small>
              <strong>
                {selection.type === "wallet_charge"
                  ? "کیف پول"
                  : selection.type === "promotion"
                    ? "تبلیغات"
                    : "اشتراک"}
              </strong>
            </div>
            <div><small>مبلغ</small><strong>{amountLabel}</strong></div>
            <hr />
            <div className={styles.total}><small>مبلغ قابل پرداخت</small><strong>{amountLabel}</strong></div>
            <Link href="/account/invoices">مشاهده فاکتورها</Link>
          </aside>
        </section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
