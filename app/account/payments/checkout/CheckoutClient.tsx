"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import MobileBottomNav from "../../../components/MobileBottomNav";
import styles from "./page.module.css";

type CheckoutType = "wallet_charge" | "promotion" | "subscription" | "service";
type PaymentMethod = "wallet" | "gateway";

type CommerceService = {
  service_key: string;
  title: string;
  audience?: string;
  amount_toman: number;
  duration_value?: number;
  duration_unit?: string;
  is_active: boolean;
  settings?: Record<string, unknown>;
};

type CommerceResponse = {
  success?: boolean;
  message?: string;
  services?: CommerceService[];
  payment_gateway_ready?: boolean;
};

type FinanceSummaryResponse = {
  success?: boolean;
  message?: string;
  wallet_payment_ready?: boolean;
  wallet?: {
    available_balance_toman: number;
    blocked_balance_toman: number;
    status: string;
  };
};

type CreateOrderResponse = {
  success?: boolean;
  message?: string;
  order?: {
    order_no: string;
    amount_toman: number;
    status: string;
    product_code?: string;
  };
};

type CreatePaymentResponse = {
  success?: boolean;
  message?: string;
  payment_url?: string;
};

type WalletPayResponse = {
  success?: boolean;
  pending?: boolean;
  retryable?: boolean;
  message?: string;
  code?: string;
  invoice_no?: string;
  available_balance_toman?: number;
};

const legacyServiceKeys: Record<string, string> = {
  boost: "listing_bump",
  featured: "listing_featured",
  story: "listing_story",
  professional: "professional_profile_6m",
  dealership: "professional_profile_12m",
};

const serviceDescriptions: Record<string, string> = {
  listing_personal_publish: "انتشار آگهی شخصی با تعرفه فعال سایت",
  listing_personal_renew: "تمدید آگهی شخصی بدون ثبت دوباره",
  listing_dealer_publish: "انتشار آگهی با تعرفه نمایشگاهی",
  listing_dealer_renew: "تمدید آگهی نمایشگاه",
  listing_bump: "انتقال آگهی فعال به ابتدای نتایج مرتبط",
  listing_featured: "نمایش برجسته‌تر آگهی همراه نشان ویژه",
  listing_story: "نمایش آگهی در استوری کاربران محدوده مرتبط",
  professional_profile_6m: "فعال‌سازی امکانات حرفه‌ای مجموعه برای شش ماه",
  professional_profile_12m: "فعال‌سازی امکانات حرفه‌ای مجموعه برای یک سال",
};

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value || 0))} تومان`;
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

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function checkoutType(value: string | null): CheckoutType {
  if (value === "promotion" || value === "subscription" || value === "service") return value;
  return "wallet_charge";
}

function typeTitle(type: CheckoutType) {
  if (type === "wallet_charge") return "کیف پول";
  if (type === "promotion") return "تبلیغات";
  if (type === "subscription") return "اشتراک";
  return "خدمات";
}

export default function CheckoutClient() {
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<CommerceResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [finance, setFinance] = useState<FinanceSummaryResponse | null>(null);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("gateway");
  const [walletAmount, setWalletAmount] = useState("500000");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestKeyRef = useRef("");

  useEffect(() => {
    setQuery(window.location.search);
    requestKeyRef.current = crypto.randomUUID();

    async function loadData() {
      setCatalogLoading(true);
      setFinanceLoading(true);

      const headers = { Accept: "application/json", ...authHeaders() };
      const [catalogResult, financeResult] = await Promise.allSettled([
        fetch("/api/auth/commerce", {
          cache: "no-store",
          credentials: "include",
          headers,
        }),
        fetch("/api/finance/summary", {
          cache: "no-store",
          credentials: "include",
          headers,
        }),
      ]);

      try {
        if (catalogResult.status === "fulfilled") {
          const result = await readJson<CommerceResponse>(catalogResult.value);
          if (!catalogResult.value.ok || !result?.success) {
            setError(result?.message || "تعرفه‌های فعال دریافت نشد.");
          } else {
            setCatalog(result);
          }
        } else {
          setError("ارتباط با سامانه تعرفه‌ها برقرار نشد.");
        }

        if (financeResult.status === "fulfilled") {
          const result = await readJson<FinanceSummaryResponse>(financeResult.value);
          if (financeResult.value.ok && result?.success) setFinance(result);
        }
      } finally {
        setCatalogLoading(false);
        setFinanceLoading(false);
      }
    }

    void loadData();
  }, []);

  const queryParams = useMemo(() => new URLSearchParams(query), [query]);
  const type = checkoutType(queryParams.get("type"));
  const listingId = queryParams.get("listing_id") || "";
  const dealerId = queryParams.get("dealer_id") || "";
  const province = queryParams.get("province") || "";
  const discountCode = queryParams.get("discount_code") || "";
  const requestedCode =
    queryParams.get("service_key") ||
    queryParams.get("product") ||
    queryParams.get("plan") ||
    "";
  const serviceKey = legacyServiceKeys[requestedCode] || requestedCode;
  const service = useMemo(
    () =>
      (catalog?.services || []).find(
        (item) => item.service_key === serviceKey && item.is_active,
      ) || null,
    [catalog?.services, serviceKey],
  );

  const isWalletCharge = type === "wallet_charge";
  const selectedMethod: PaymentMethod = isWalletCharge ? "gateway" : paymentMethod;
  const requiresBannerConfiguration = !isWalletCharge && /banner/.test(serviceKey || requestedCode);
  const requiresListing = !isWalletCharge && serviceKey.startsWith("listing_");
  const requiresDealer = !isWalletCharge && serviceKey.startsWith("professional_profile_");
  const hasValidListing = /^\d+$/.test(listingId) && Number(listingId) > 0;
  const hasValidDealer = /^\d+$/.test(dealerId) && Number(dealerId) > 0;
  const amount = isWalletCharge ? normalizeAmount(walletAmount) : Number(service?.amount_toman || 0);
  const title = isWalletCharge ? "افزایش موجودی کیف پول" : service?.title || "خدمت انتخاب‌شده";
  const description = isWalletCharge
    ? "مبلغ دلخواه را برای شارژ کیف پول چاکود وارد کنید."
    : serviceDescriptions[serviceKey] || "تعرفه و مدت این خدمت از پنل مدیریت چاکود خوانده می‌شود.";
  const gatewayReady = catalog?.payment_gateway_ready !== false;
  const walletPaymentReady = finance?.wallet_payment_ready === true;
  const walletAvailable = Number(finance?.wallet?.available_balance_toman || 0);
  const walletBlocked = Number(finance?.wallet?.blocked_balance_toman || 0);
  const walletEnough = walletAvailable >= amount && amount > 0;
  const serviceUnavailable = !isWalletCharge && !catalogLoading && !service && !requiresBannerConfiguration;
  const methodReady = selectedMethod === "wallet" ? walletPaymentReady && walletEnough : gatewayReady;

  async function startPayment() {
    setError("");
    setNotice("");

    if (requiresBannerConfiguration) {
      window.location.assign("/account/ads");
      return;
    }

    if (requiresListing && !hasValidListing) {
      window.location.assign("/account/listings");
      return;
    }

    if (requiresDealer && !hasValidDealer) {
      window.location.assign("/account/business");
      return;
    }

    if (serviceUnavailable) {
      setError("این خدمت در تنظیمات فعلی سایت فعال نیست.");
      return;
    }

    if (selectedMethod === "gateway" && !gatewayReady) {
      setError("درگاه پرداخت هنوز در تنظیمات محیط فعال نشده است.");
      return;
    }

    if (selectedMethod === "wallet" && !walletPaymentReady) {
      setError("پرداخت خدمات از کیف پول هنوز به Settlement سرور متصل نشده است.");
      return;
    }

    if (selectedMethod === "wallet" && !walletEnough) {
      setError("موجودی کیف پول برای این سفارش کافی نیست. ابتدا کیف پول را شارژ کنید.");
      return;
    }

    if (amount < 10_000) {
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
      const idempotencyKey = requestKeyRef.current || crypto.randomUUID();
      requestKeyRef.current = idempotencyKey;

      const orderResponse = await fetch("/api/finance/orders", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          type,
          service_key: isWalletCharge ? "wallet_charge" : serviceKey,
          amount_toman: isWalletCharge ? amount : undefined,
          listing_id: requiresListing ? Number(listingId) : undefined,
          dealer_id: requiresDealer ? Number(dealerId) : undefined,
          province: province || undefined,
          discount_code: discountCode || undefined,
          idempotency_key: idempotencyKey,
        }),
      });
      const orderResult = await readJson<CreateOrderResponse>(orderResponse);

      if (!orderResponse.ok || !orderResult?.success || !orderResult.order?.order_no) {
        setError(orderResult?.message || "ساخت سفارش انجام نشد. دوباره تلاش کنید.");
        return;
      }

      if (selectedMethod === "wallet" && !isWalletCharge) {
        const response = await fetch("/api/finance/wallet/pay", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            order_no: orderResult.order.order_no,
            idempotency_key: idempotencyKey,
          }),
        });
        const result = await readJson<WalletPayResponse>(response);

        if (response.status === 202 && result?.pending) {
          setNotice(
            result.message ||
              "مبلغ سفارش رزرو شده و نهایی‌سازی Commerce در حال بررسی است. با Retry دوباره برداشت نمی‌شود.",
          );
          return;
        }

        if (!response.ok || !result?.success) {
          setError(result?.message || "پرداخت از کیف پول انجام نشد.");
          return;
        }

        setFinance((current) =>
          current
            ? {
                ...current,
                wallet: current.wallet
                  ? {
                      ...current.wallet,
                      available_balance_toman: Number(
                        result.available_balance_toman ?? current.wallet.available_balance_toman,
                      ),
                    }
                  : current.wallet,
              }
            : current,
        );
        setNotice("پرداخت از کیف پول موفق بود و فاکتور صادر شد.");
        const invoiceQuery = result.invoice_no
          ? `?paid=wallet&invoice=${encodeURIComponent(result.invoice_no)}`
          : "?paid=wallet";
        window.setTimeout(() => {
          window.location.assign(`/account/invoices${invoiceQuery}`);
        }, 500);
        return;
      }

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
          type,
          service_key: isWalletCharge ? "wallet_charge" : serviceKey,
          order_no: orderResult.order.order_no,
          idempotency_key: idempotencyKey,
          callback_path: "/account/payments/callback",
        }),
      });
      const result = await readJson<CreatePaymentResponse>(response);

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

  const missingTarget =
    (requiresListing && !hasValidListing) || (requiresDealer && !hasValidDealer);
  const actionLabel = submitting
    ? selectedMethod === "wallet"
      ? "در حال پرداخت از کیف پول..."
      : "در حال اتصال به درگاه..."
    : requiresBannerConfiguration
      ? "تکمیل اطلاعات بنر"
      : requiresListing && !hasValidListing
        ? "انتخاب آگهی"
        : requiresDealer && !hasValidDealer
          ? "انتخاب مجموعه"
          : serviceUnavailable
            ? "خدمت غیرفعال است"
            : selectedMethod === "wallet"
              ? !walletPaymentReady
                ? "Settlement کیف پول در انتظار تنظیم"
                : !walletEnough
                  ? "موجودی کیف پول کافی نیست"
                  : `پرداخت ${formatToman(amount)} از کیف پول`
              : !gatewayReady
                ? "درگاه در انتظار تنظیم"
                : `پرداخت ${formatToman(amount)} از درگاه`;

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
            <h1>{catalogLoading && !isWalletCharge ? "در حال دریافت تعرفه..." : title}</h1>
            <p>{description}</p>

            {isWalletCharge && (
              <label className={styles.amountField}>
                <span>مبلغ افزایش موجودی</span>
                <div>
                  <input
                    inputMode="numeric"
                    value={walletAmount}
                    onChange={(event) => {
                      setWalletAmount(event.target.value);
                      requestKeyRef.current = crypto.randomUUID();
                    }}
                    aria-label="مبلغ افزایش موجودی"
                  />
                  <b>تومان</b>
                </div>
                <small>حداقل مبلغ قابل پرداخت ۱۰٬۰۰۰ تومان است.</small>
              </label>
            )}

            {!isWalletCharge && !requiresBannerConfiguration && (
              <section className={styles.paymentMethods} aria-label="روش پرداخت">
                <button
                  type="button"
                  className={paymentMethod === "wallet" ? styles.paymentMethodActive : ""}
                  onClick={() => setPaymentMethod("wallet")}
                  disabled={financeLoading}
                >
                  <span>کیف پول چاکود</span>
                  <strong>{financeLoading ? "در حال دریافت موجودی..." : formatToman(walletAvailable)}</strong>
                  <small>
                    {walletBlocked > 0
                      ? `${formatToman(walletBlocked)} در حال پردازش است`
                      : walletPaymentReady
                        ? "پرداخت فوری بدون خروج از چاکود"
                        : "Settlement سرور هنوز تنظیم نشده"}
                  </small>
                </button>
                <button
                  type="button"
                  className={paymentMethod === "gateway" ? styles.paymentMethodActive : ""}
                  onClick={() => setPaymentMethod("gateway")}
                >
                  <span>درگاه بانکی</span>
                  <strong>پرداخت آنلاین</strong>
                  <small>{gatewayReady ? "انتقال امن به درگاه" : "درگاه هنوز تنظیم نشده"}</small>
                </button>
              </section>
            )}

            {!isWalletCharge && paymentMethod === "wallet" && !financeLoading && !walletEnough && (
              <div className={styles.walletTopUpNote}>
                <div>
                  <strong>موجودی برای این سفارش کافی نیست</strong>
                  <span>
                    کمبود: {formatToman(Math.max(0, amount - walletAvailable))}
                  </span>
                </div>
                <Link href="/account/payments/checkout?type=wallet_charge">شارژ کیف پول</Link>
              </div>
            )}

            {requiresBannerConfiguration && (
              <div className={styles.securityNote}>
                <span>۱</span>
                <p>ابتدا استان، تاریخ، تصاویر و مقصد بنر را مشخص کنید؛ سپس پیش‌فاکتور واقعی ساخته می‌شود.</p>
              </div>
            )}

            {requiresListing && !hasValidListing && (
              <div className={styles.securityNote}>
                <span>۱</span>
                <p>برای خرید این خدمت ابتدا یکی از آگهی‌های قابل مدیریت خود را انتخاب کنید.</p>
              </div>
            )}

            {requiresListing && hasValidListing && (
              <div className={styles.securityNote}>
                <span>✓</span>
                <p>این سفارش به آگهی شماره {new Intl.NumberFormat("fa-IR").format(Number(listingId))} متصل می‌شود.</p>
              </div>
            )}

            {serviceUnavailable && (
              <div className={styles.securityNote}>
                <span>!</span>
                <p>این خدمت در فهرست تعرفه‌های فعال Commerce وجود ندارد و تا فعال‌سازی مدیر قابل خرید نیست.</p>
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}
            {notice && <div className={styles.notice}>{notice}</div>}

            <button
              className={styles.payButton}
              type="button"
              disabled={
                submitting ||
                catalogLoading ||
                serviceUnavailable ||
                (!requiresBannerConfiguration && !methodReady)
              }
              onClick={() => void startPayment()}
            >
              {actionLabel}
            </button>

            {!requiresBannerConfiguration && !missingTarget && !serviceUnavailable && (
              <div className={styles.securityNote}>
                <span>✓</span>
                <p>
                  {selectedMethod === "wallet"
                    ? "مبلغ ابتدا رزرو می‌شود؛ فقط پس از نهایی‌شدن Commerce از کیف پول کسر قطعی و فاکتور صادر می‌شود."
                    : "مبلغ از Commerce خوانده می‌شود و تراکنش فقط پس از تأیید سمت سرور نهایی خواهد شد."}
                </p>
              </div>
            )}
          </div>

          <aside className={styles.summaryCard}>
            <span>خلاصه سفارش</span>
            <div><small>عنوان</small><strong>{title}</strong></div>
            <div><small>نوع سفارش</small><strong>{typeTitle(type)}</strong></div>
            {!isWalletCharge && <div><small>کد خدمت</small><strong dir="ltr">{serviceKey || "—"}</strong></div>}
            {!isWalletCharge && (
              <div>
                <small>روش پرداخت</small>
                <strong>{selectedMethod === "wallet" ? "کیف پول چاکود" : "درگاه بانکی"}</strong>
              </div>
            )}
            {requiresListing && (
              <div>
                <small>آگهی هدف</small>
                <strong>{hasValidListing ? `#${new Intl.NumberFormat("fa-IR").format(Number(listingId))}` : "انتخاب نشده"}</strong>
              </div>
            )}
            <div><small>مبلغ</small><strong>{catalogLoading && !isWalletCharge ? "در حال دریافت" : formatToman(amount)}</strong></div>
            <hr />
            <div className={styles.total}>
              <small>مبلغ قابل پرداخت</small>
              <strong>{catalogLoading && !isWalletCharge ? "—" : formatToman(amount)}</strong>
            </div>
            <Link href="/account/invoices">مشاهده فاکتورها</Link>
          </aside>
        </section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
