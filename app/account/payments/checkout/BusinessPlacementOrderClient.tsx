"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.css";

type OrderResponse = {
  success?: boolean;
  message?: string;
  order?: { order_no?: string; amount_toman?: number; status?: string };
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
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

export default function BusinessPlacementOrderClient({ dealerId }: { dealerId: number }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  async function createOrder() {
    if (working) return;
    const token = localStorage.getItem("chakod_session_token") || "";
    if (!token) {
      const returnTo = `/account/payments/checkout?type=service&service_key=business_placement&dealer_id=${dealerId}`;
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    setWorking(true);
    setError("");

    try {
      const response = await fetch("/api/finance/orders", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          type: "service",
          service_key: "business_placement",
          dealer_id: dealerId,
          idempotency_key: idempotencyKey,
        }),
      });
      const payload = await readJson<OrderResponse>(response);

      if (response.status === 401) {
        const returnTo = `/account/payments/checkout?type=service&service_key=business_placement&dealer_id=${dealerId}`;
        router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      const orderNo = payload?.order?.order_no?.trim() || "";
      if (!response.ok || !payload?.success || !orderNo) {
        setError(payload?.message || "ساخت سفارش جایگاه کسب‌وکار انجام نشد.");
        return;
      }

      router.replace(`/account/payments/checkout/order/${encodeURIComponent(orderNo)}`);
    } catch {
      setError("ارتباط با سامانه سفارش برقرار نشد.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/account/business/promotions">← بازگشت به تبلیغات</Link>
          <Link href="/" className={styles.brand}>
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        <div className={styles.checkoutGrid}>
          <section className={styles.checkoutCard}>
            <span className={styles.eyebrow}>BUSINESS PLACEMENT</span>
            <h1>تایید سفارش جایگاه کسب‌وکار</h1>
            <p>شناسه مجموعه در سمت سرور دوباره با فهرست کسب‌وکارهای قابل مدیریت شما تطبیق داده می‌شود؛ مبلغ نیز فقط از Commerce خوانده خواهد شد.</p>

            {error ? <div className={styles.error}>{error}</div> : null}

            <button className={styles.payButton} type="button" onClick={() => void createOrder()} disabled={working}>
              {working ? "در حال ساخت سفارش…" : "ساخت سفارش و انتخاب روش پرداخت"}
            </button>

            <div className={styles.securityNote}>
              <span>✓</span>
              <p>هیچ مبلغی از مرورگر پذیرفته نمی‌شود؛ Commerce مبلغ فعال را در سفارش قفل می‌کند.</p>
            </div>
          </section>

          <aside className={styles.summaryCard}>
            <span>خلاصه سفارش</span>
            <div>
              <small>مجموعه هدف</small>
              <strong>شناسه {new Intl.NumberFormat("fa-IR").format(dealerId)}</strong>
            </div>
            <div>
              <small>محصول</small>
              <strong>جایگاه ویژه کسب‌وکار</strong>
            </div>
            <div>
              <small>قیمت</small>
              <strong>از تعرفه فعال Commerce</strong>
            </div>
            <Link href="/account/business">مدیریت کسب‌وکار</Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
