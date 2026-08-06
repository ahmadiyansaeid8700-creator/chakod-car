"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./CommerceProductsPage.module.css";

type CommerceMode = "promotions" | "subscriptions";

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

type Dealer = {
  dealer_id: number;
  dealer_name: string;
  role: string;
};

type Subscription = {
  id: number;
  dealer_id: number;
  service_key: string;
  status: string;
  starts_at?: string | null;
  expires_at?: string | null;
};

type CommerceResponse = {
  success?: boolean;
  message?: string;
  services?: CommerceService[];
  dealers?: Dealer[];
  subscriptions?: Subscription[];
  payment_gateway_ready?: boolean;
};

const promotionKeys = new Set([
  "listing_bump",
  "listing_featured",
  "listing_story",
  "home_banner_regular",
  "home_banner_large",
  "business_placement",
  "dealership_placement",
]);

const serviceDescriptions: Record<string, string> = {
  listing_bump: "انتقال آگهی فعال به ابتدای نتایج مرتبط",
  listing_featured: "نمایش برجسته‌تر آگهی همراه نشان ویژه",
  listing_story: "نمایش آگهی در استوری کاربران محدوده مرتبط",
  home_banner_regular: "رزرو بنر صفحه اصلی برای استان‌های عادی",
  home_banner_large: "رزرو بنر صفحه اصلی برای استان‌های بزرگ",
  business_placement: "نمایش بالاتر کسب‌وکار در شهر و دسته مرتبط",
  dealership_placement: "جایگاه اسپانسر نمایشگاه همراه برچسب تبلیغ",
  professional_profile_6m: "فعال‌سازی صفحه حرفه‌ای مجموعه برای شش ماه",
  professional_profile_12m: "فعال‌سازی صفحه حرفه‌ای مجموعه برای یک سال",
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

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value || 0))} تومان`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

function serviceHref(service: CommerceService, dealerId: number) {
  if (service.service_key.startsWith("listing_")) return "/account/listings";
  if (service.service_key.includes("banner")) return "/account/ads";
  if (service.service_key.startsWith("professional_profile_")) {
    return dealerId
      ? `/account/payments/checkout?type=subscription&service_key=${encodeURIComponent(service.service_key)}&dealer_id=${dealerId}`
      : "/account/business";
  }
  if (service.service_key.includes("placement")) return "/account/business";
  return `/account/payments/checkout?type=service&service_key=${encodeURIComponent(service.service_key)}${dealerId ? `&dealer_id=${dealerId}` : ""}`;
}

export default function CommerceProductsPage({ mode }: { mode: CommerceMode }) {
  const [data, setData] = useState<CommerceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dealerId, setDealerId] = useState(0);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/commerce", {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<CommerceResponse>(response);

      if (response.status === 401 || response.status === 403) {
        window.location.assign(
          `/login?returnTo=${encodeURIComponent(mode === "promotions" ? "/account/promotions" : "/account/subscriptions")}`,
        );
        return;
      }

      if (!response.ok || !payload?.success) {
        setError(payload?.message || "محصولات فعال دریافت نشد.");
        return;
      }

      setData(payload);
      if (!dealerId && payload.dealers?.[0]) setDealerId(payload.dealers[0].dealer_id);
    } catch {
      setError("ارتباط با سامانه محصولات و تعرفه‌ها برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const services = useMemo(() => {
    const active = (data?.services || []).filter((service) => service.is_active);
    return mode === "promotions"
      ? active.filter((service) => promotionKeys.has(service.service_key))
      : active.filter((service) => service.service_key.startsWith("professional_profile_"));
  }, [data?.services, mode]);

  const currentSubscription = useMemo(
    () => (data?.subscriptions || []).find(
      (subscription) => subscription.dealer_id === dealerId && subscription.status === "active",
    ) || null,
    [data?.subscriptions, dealerId],
  );

  const title = mode === "promotions" ? "تبلیغات و دیده‌شدن بیشتر" : "اشتراک‌های حرفه‌ای";
  const description = mode === "promotions"
    ? "تعرفه‌های فعال تبلیغاتی مستقیماً از تنظیمات مدیریت چاکود خوانده می‌شوند."
    : "پلن حرفه‌ای مجموعه را با مبلغ و مدت ثبت‌شده در Commerce انتخاب کنید.";

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/account" className={styles.back}>← حساب من</Link>
          <Link href="/" className={styles.brand}>
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        <section className={styles.hero}>
          <span>{mode === "promotions" ? "CHAKOD PROMOTIONS" : "CHAKOD SUBSCRIPTIONS"}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className={styles.heroLinks}>
            <Link href="/account/wallet">کیف پول</Link>
            <Link href="/account/payments">پرداخت‌ها</Link>
            <Link href="/account/invoices">فاکتورها</Link>
            <Link className={mode === "promotions" ? styles.activeLink : ""} href="/account/promotions">تبلیغات</Link>
            <Link className={mode === "subscriptions" ? styles.activeLink : ""} href="/account/subscriptions">اشتراک‌ها</Link>
          </div>
        </section>

        {mode === "subscriptions" && (data?.dealers?.length || 0) > 0 && (
          <section className={styles.selectorPanel}>
            <div>
              <span>مجموعه هدف</span>
              <h2>اشتراک برای کدام نمایشگاه یا کسب‌وکار فعال شود؟</h2>
            </div>
            <select value={dealerId} onChange={(event) => setDealerId(Number(event.target.value))}>
              {data?.dealers?.map((dealer) => (
                <option key={dealer.dealer_id} value={dealer.dealer_id}>{dealer.dealer_name}</option>
              ))}
            </select>
          </section>
        )}

        {currentSubscription && mode === "subscriptions" && (
          <section className={styles.subscriptionStatus}>
            <span>اشتراک فعال</span>
            <strong>{currentSubscription.service_key}</strong>
            <small>اعتبار تا {formatDate(currentSubscription.expires_at)}</small>
          </section>
        )}

        {loading && (
          <section className={styles.stateCard}>
            <span className={styles.loader} />
            <h2>در حال دریافت محصولات فعال</h2>
            <p>تعرفه و مدت خدمات از Commerce خوانده می‌شود.</p>
          </section>
        )}

        {!loading && error && (
          <section className={styles.stateCard}>
            <span className={styles.stateIcon}>!</span>
            <h2>محصولات در دسترس نیستند</h2>
            <p>{error}</p>
            <button type="button" onClick={() => void load()}>تلاش دوباره</button>
          </section>
        )}

        {!loading && !error && services.length > 0 && (
          <section className={styles.productGrid}>
            {services.map((service) => {
              const href = serviceHref(service, dealerId);
              const listingProduct = service.service_key.startsWith("listing_");
              const bannerProduct = service.service_key.includes("banner");
              const targetMissing = mode === "subscriptions" && !dealerId;

              return (
                <article className={styles.productCard} key={service.service_key}>
                  <span className={styles.badge}>{service.audience || "خدمت فعال"}</span>
                  <h2>{service.title}</h2>
                  <p>{serviceDescriptions[service.service_key] || "این محصول براساس تنظیمات فعال چاکود ارائه می‌شود."}</p>
                  <strong>{formatToman(service.amount_toman)}</strong>
                  {(service.duration_value || 0) > 0 && (
                    <small>مدت: {new Intl.NumberFormat("fa-IR").format(Number(service.duration_value))} {service.duration_unit || "روز"}</small>
                  )}
                  <Link className={targetMissing ? styles.disabledLink : ""} href={targetMissing ? "/account/business" : href}>
                    {listingProduct
                      ? "انتخاب آگهی"
                      : bannerProduct
                        ? "انتخاب استان و تاریخ"
                        : targetMissing
                          ? "ابتدا مجموعه را بسازید"
                          : "انتخاب و ادامه پرداخت"}
                  </Link>
                </article>
              );
            })}
          </section>
        )}

        {!loading && !error && services.length === 0 && (
          <section className={styles.stateCard}>
            <span className={styles.stateIcon}>⌁</span>
            <h2>محصول فعالی در این بخش وجود ندارد</h2>
            <p>مدیر سایت باید تعرفه و وضعیت این محصولات را در Commerce تنظیم کند.</p>
            <Link href="/account/services">مشاهده مرکز خدمات موجود</Link>
          </section>
        )}

        {data?.payment_gateway_ready === false && !loading && (
          <div className={styles.gatewayNotice}>
            درگاه پرداخت هنوز در تنظیمات محیط فعال نشده است؛ انتخاب محصول ممکن است اما انتقال بانکی پس از ثبت مشخصات درگاه فعال می‌شود.
          </div>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
