"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import MobileBottomNav from "../../../../../components/MobileBottomNav";
import styles from "../../page.module.css";

type PaymentMethod = "wallet" | "gateway";

type OrderResponse = {
  success?: boolean;
  message?: string;
  order?: {
    order_no: string;
    type: string;
    product_code: string;
    amount_toman: number;
    original_amount_toman: number;
    discount_amount_toman: number;
    status: string;
    metadata?: Record<string, unknown>;
  };
};

type FinanceSummaryResponse = {
  success?: boolean;
  wallet_payment_ready?: boolean;
  wallet?: {
    available_balance_toman: number;
    blocked_balance_toman: number;
    status: string;
  };
};

type CommerceResponse = {
  success?: boolean;
  payment_gateway_ready?: boolean;
};

type PaymentResponse = {
  success?: boolean;
  pending?: boolean;
  message?: string;
  payment_url?: string;
  invoice_no?: string;
  available_balance_toman?: number;
};

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

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value || 0))} تومان`;
}

function cleanMetadataText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export default function ExistingOrderCheckoutClient({ orderNo }: { orderNo: string }) {
  const [orderData, setOrderData] = useState<OrderResponse["order"] | null>(null);
  const [finance, setFinance] = useState<FinanceSummaryResponse | null>(null);
  const [gatewayReady, setGatewayReady] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>("gateway");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    // The canonical session is the HttpOnly chakod_session cookie. A legacy
    // localStorage token may be present on some clients, but its absence must
    // never force a signed-in PWA/browser user back to Login.
    const headers = { Accept: "application/json", ...authHeaders() };
    const [orderResult, financeResult, commerceResult] = await Promise.allSettled([
      fetch(`/api/finance/order?order_no=${encodeURIComponent(orderNo)}`, {
        cache: "no-store",
        credentials: "include",
        headers,
      }),
      fetch("/api/finance/summary", {
        cache: "no-store",
        credentials: "include",
        headers,
      }),
      fetch("/api/auth/commerce", {
        cache: "no-store",
        credentials: "include",
        headers,
      }),
    ]);

    try {
      if (orderResult.status !== "fulfilled") {
        setError("اطلاعات سفارش دریافت نشد.");
        return;
      }

      const orderPayload = await readJson<OrderResponse>(orderResult.value);
      if (orderResult.value.status === 401) {
        const returnTo = `/account/payments/checkout/order/${encodeURIComponent(orderNo)}`;
        window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      if (!orderResult.value.ok || !orderPayload?.success || !orderPayload.order) {
        setError(orderPayload?.message || "سفارش قابل پرداخت پیدا نشد.");
        return;
      }
      setOrderData(orderPayload.order);

      if (financeResult.status === "fulfilled") {
        const financePayload = await readJson<FinanceSummaryResponse>(financeResult.value);
        if (financeResult.value.ok && financePayload?.success) setFinance(financePayload);
      }

      if (commerceResult.status === "fulfilled") {
        const commercePayload = await readJson<CommerceResponse>(commerceResult.value);
        if (commerceResult.value.ok && commercePayload?.success) {
          setGatewayReady(commercePayload.payment_gateway_ready !== false);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [orderNo]);

  const amount = Number(orderData?.amount_toman || 0);
  const originalAmount = Number(orderData?.original_amount_toman || amount);
  const discountAmount = Number(orderData?.discount_amount_toman || 0);
  const discountPercent = originalAmount > 0
    ? Math.min(100, Math.round((discountAmount / originalAmount) * 100))
    : 0;
  const walletAvailable = Number(finance?.wallet?.available_balance_toman || 0);
  const walletBlocked = Number(finance?.wallet?.blocked_balance_toman || 0);
  const walletReady = finance?.wallet_payment_ready === true;
  const walletEnough = walletAvailable >= amount && amount > 0;
  const metadata = orderData?.metadata || {};
  const publicProduct = cleanMetadataText(metadata.public_product_code);
  const title =
    cleanMetadataText(metadata.service_title) ||
    (publicProduct === "dealership_placement" ? "جایگاه نمایشگاه منتخب" : "سفارش چاکود");
  const dealerName = cleanMetadataText(metadata.dealer_name);
  const targetName = cleanMetadataText(metadata.target_name);
  const province = cleanMetadataText(metadata.province);
  const startDate = cleanMetadataText(metadata.start_date);
  const endDate = cleanMetadataText(metadata.end_date);
  const isSelectedTestOrder =
    publicProduct === "homepage_selected" &&
    discountPercent === 100 &&
    discountAmount > 0 &&
    amount === 0;
  const isSelectedTestPaid = isSelectedTestOrder && orderData?.status === "paid";

  async function pay() {
    if (!orderData || submitting) return;
    setError("");
    setNotice("");

    if (orderData.status === "paid") {
      setNotice("این سفارش قبلا پرداخت شده است.");
      return;
    }

    if (orderData.status !== "pending_payment") {
      setError("این سفارش در وضعیت قابل پرداخت نیست.");
      return;
    }

    if (method === "wallet" && !walletReady) {
      setError("پرداخت از کیف پول هنوز به Settlement سرور متصل نشده است.");
      return;
    }
    if (method === "wallet" && !walletEnough) {
      setError("موجودی کیف پول کافی نیست. ابتدا کیف پول را شارژ کنید.");
      return;
    }
    if (method === "gateway" && !gatewayReady) {
      setError("درگاه بانکی هنوز در تنظیمات محیط فعال نشده است.");
      return;
    }

    setSubmitting(true);
    try {
      if (method === "wallet") {
        const response = await fetch("/api/finance/wallet/pay", {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ order_no: orderData.order_no }),
        });
        const payload = await readJson<PaymentResponse>(response);

        if (response.status === 202 && payload?.pending) {
          setNotice(payload.message || "پرداخت در حال نهایی شدن است و دوباره برداشت نمی‌شود.");
          return;
        }
        if (!response.ok || !payload?.success) {
          setError(payload?.message || "پرداخت از کیف پول انجام نشد.");
          return;
        }

        setNotice("پرداخت موفق بود و سفارش برای مرحله بعد ثبت شد.");
        window.setTimeout(() => {
          window.location.assign("/account/invoices?paid=wallet");
        }, 500);
        return;
      }

      const response = await fetch("/api/payments/create", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          order_no: orderData.order_no,
          callback_path: "/account/payments/callback",
        }),
      });
      const payload = await readJson<PaymentResponse>(response);
      if (!response.ok || !payload?.success || !payload.payment_url) {
        setError(payload?.message || "اتصال به درگاه انجام نشد.");
        return;
      }
      window.location.assign(payload.payment_url);
    } catch {
      setError("ارتباط با سرویس پرداخت برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href={isSelectedTestOrder ? "/account/selected" : "/account/payments"}>
            {isSelectedTestOrder ? "بازگشت به منتخب‌ها" : "بازگشت به مرکز مالی"}
          </Link>
          <Link className={styles.brand} href="/">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        {loading ? (
          <section className={styles.checkoutCard}>
            <h1>در حال دریافت سفارش</h1>
            <p>مبلغ و اطلاعات سفارش از سرور خوانده می‌شود.</p>
          </section>
        ) : error && !orderData ? (
          <section className={styles.checkoutCard}>
            <h1>سفارش در دسترس نیست</h1>
            <div className={styles.error}>{error}</div>
            <button className={styles.payButton} type="button" onClick={() => void load()}>
              تلاش دوباره
            </button>
          </section>
        ) : orderData ? (
          <section className={styles.checkoutGrid}>
            <div className={styles.checkoutCard}>
              <span className={styles.eyebrow}>{isSelectedTestOrder ? "پرداخت آزمایشی منتخب" : "تسویه حساب امن"}</span>
              <h1>{title}</h1>
              <p>
                {targetName || dealerName
                  ? `${targetName || dealerName}${province ? `، ${province}` : ""}`
                  : "سفارش ثبت شده در چاکود"}
                {startDate && endDate ? ` — از ${startDate} تا ${endDate}` : ""}
              </p>

              {isSelectedTestOrder ? (
                <div className={styles.securityNote}>
                  <span>✓</span>
                  <p>
                    تخفیف تست ۱۰۰٪ روی این سفارش اعمال شده است؛ مبلغ اصلی {formatToman(originalAmount)}، تخفیف {formatToman(discountAmount)} و مبلغ نهایی صفر است.
                  </p>
                </div>
              ) : (
                <div className={styles.paymentMethods}>
                  <button
                    type="button"
                    className={method === "gateway" ? styles.paymentMethodActive : ""}
                    onClick={() => setMethod("gateway")}
                  >
                    <b>درگاه بانکی</b>
                    <small>{gatewayReady ? "پرداخت مستقیم بانکی" : "در انتظار تنظیم درگاه"}</small>
                  </button>
                  <button
                    type="button"
                    className={method === "wallet" ? styles.paymentMethodActive : ""}
                    onClick={() => setMethod("wallet")}
                  >
                    <b>کیف پول چاکود</b>
                    <small>موجودی: {formatToman(walletAvailable)}</small>
                  </button>
                </div>
              )}

              {!isSelectedTestOrder && method === "wallet" && (
                <div className={styles.securityNote}>
                  <span>{walletEnough ? "✓" : "!"}</span>
                  <p>
                    موجودی قابل استفاده {formatToman(walletAvailable)} است و {formatToman(walletBlocked)} نیز در حال حاضر مسدود است.
                  </p>
                </div>
              )}

              {error && <div className={styles.error}>{error}</div>}
              {notice && <div className={styles.securityNote}><span>✓</span><p>{notice}</p></div>}

              <button
                className={styles.payButton}
                type="button"
                disabled={submitting || orderData.status === "paid"}
                onClick={() => void pay()}
              >
                {isSelectedTestPaid
                  ? "تخفیف ۱۰۰٪ اعمال شد — جایگاه فعال است"
                  : orderData.status === "paid"
                    ? "این سفارش پرداخت شده است"
                    : submitting
                      ? "در حال پردازش..."
                      : `پرداخت ${formatToman(amount)}`}
              </button>

              {isSelectedTestPaid ? (
                <Link href="/">مشاهده نتیجه در صفحه اول</Link>
              ) : !isSelectedTestOrder && method === "wallet" && !walletEnough ? (
                <Link href="/account/payments/checkout?type=wallet_charge">
                  افزایش موجودی کیف پول
                </Link>
              ) : null}
            </div>

            <aside className={styles.summaryCard}>
              <span>خلاصه سفارش</span>
              <div><small>شماره سفارش</small><strong dir="ltr">{orderData.order_no}</strong></div>
              <div><small>محصول</small><strong>{title}</strong></div>
              {targetName && <div><small>هدف منتخب</small><strong>{targetName}</strong></div>}
              {!targetName && dealerName && <div><small>نمایشگاه</small><strong>{dealerName}</strong></div>}
              {province && <div><small>استان</small><strong>{province}</strong></div>}
              <div><small>وضعیت</small><strong>{isSelectedTestPaid ? "فعال با تخفیف تست" : orderData.status}</strong></div>
              <hr />
              {discountAmount > 0 && (
                <>
                  <div><small>مبلغ اصلی</small><strong>{formatToman(originalAmount)}</strong></div>
                  <div><small>تخفیف{discountPercent ? ` ${new Intl.NumberFormat("fa-IR").format(discountPercent)}٪` : ""}</small><strong>− {formatToman(discountAmount)}</strong></div>
                </>
              )}
              <div className={styles.total}>
                <small>مبلغ نهایی</small>
                <strong>{formatToman(amount)}</strong>
              </div>
              <Link href={isSelectedTestOrder ? "/account/selected" : "/account/invoices"}>
                {isSelectedTestOrder ? "مدیریت منتخب‌ها" : "مشاهده فاکتورها"}
              </Link>
            </aside>
          </section>
        ) : null}
      </div>
      <MobileBottomNav />
    </main>
  );
}
