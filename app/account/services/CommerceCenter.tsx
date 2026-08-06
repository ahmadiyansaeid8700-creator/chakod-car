"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./CommerceCenter.module.css";

type Service = {
  service_key: string;
  title: string;
  audience: string;
  amount_toman: number;
  duration_value: number;
  duration_unit: string;
  is_active: boolean;
  settings?: Record<string, unknown>;
};

type ProvincePrice = {
  province: string;
  is_large: boolean;
  story_price_toman: number;
  story_duration_hours: number;
  story_is_active: boolean;
  banner_price_toman: number;
  banner_is_active: boolean;
};

type Listing = {
  id: number;
  title: string;
  status: string;
  moderation_status: string;
  listing_owner_type: "personal" | "dealer";
  dealer_id: number | null;
  province?: string;
  city?: string;
  expires_at?: string | null;
  last_bumped_at?: string | null;
};

type Dealer = {
  dealer_id: number;
  dealer_name: string;
  role: string;
  permissions?: string[];
};

type Order = {
  id: number;
  order_no: string;
  service_key: string;
  province?: string | null;
  total_amount_toman: number;
  original_amount_toman?: number | null;
  discount_amount_toman?: number | null;
  discount_code?: string | null;
  status: string;
  created_at: string;
  paid_at?: string | null;
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
  user?: {
    id: number;
    account_type: string;
    display_name?: string;
  };
  services?: Service[];
  provinces?: ProvincePrice[];
  listings?: Listing[];
  dealers?: Dealer[];
  orders?: Order[];
  subscriptions?: Subscription[];
  payment_gateway_ready?: boolean;
};

const serviceDescriptions: Record<string, string> = {
  listing_personal_publish: "انتشار آگهی شخصی برای ۳۰ روز",
  listing_personal_renew: "تمدید همان آگهی بدون ثبت دوباره",
  listing_dealer_publish: "انتشار آگهی خودرو با تعرفه نمایشگاهی",
  listing_dealer_renew: "تمدید آگهی نمایشگاه برای ۳۰ روز دیگر",
  listing_bump: "بازگرداندن آگهی فعال به ابتدای نتایج",
  professional_profile_6m: "نمایش عمومی صفحه حرفه‌ای مجموعه برای ۶ ماه",
  professional_profile_12m: "نمایش عمومی صفحه حرفه‌ای مجموعه برای ۱۲ ماه",
};

const statusLabels: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  failed: "ناموفق",
  cancelled: "لغوشده",
  refunded: "بازگشت وجه",
};

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("پاسخ سرور معتبر نیست.");
  }
}

export default function CommerceCenter() {
  const [data, setData] = useState<CommerceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listingId, setListingId] = useState<number>(0);
  const [dealerId, setDealerId] = useState<number>(0);
  const [province, setProvince] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [activeTab, setActiveTab] = useState<"listing" | "profile" | "orders">("listing");

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
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "اطلاعات خدمات دریافت نشد.");
      }
      setData(payload);
      const firstListing = payload.listings?.[0];
      const firstDealer = payload.dealers?.[0];
      const firstProvince = payload.provinces?.[0];
      setListingId((current) => current || firstListing?.id || 0);
      setDealerId((current) => current || firstDealer?.dealer_id || 0);
      setProvince((current) => current || firstProvince?.province || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    if (requestedTab === "profile" || requestedTab === "orders" || requestedTab === "listing") {
      setActiveTab(requestedTab);
    }

    const requestedListingId = Number(params.get("listing_id") || 0);
    const requestedDealerId = Number(params.get("dealer_id") || 0);
    if (Number.isSafeInteger(requestedListingId) && requestedListingId > 0) {
      setListingId(requestedListingId);
    }
    if (Number.isSafeInteger(requestedDealerId) && requestedDealerId > 0) {
      setDealerId(requestedDealerId);
    }
    setProvince(params.get("province") || "");
    setDiscountCode((params.get("discount_code") || "").toUpperCase());

    void load();
  }, []);

  const selectedListing = useMemo(
    () => data?.listings?.find((listing) => listing.id === listingId) || null,
    [data?.listings, listingId],
  );
  const selectedProvince = useMemo(
    () => data?.provinces?.find((item) => item.province === province) || null,
    [data?.provinces, province],
  );

  const listingServices = useMemo(() => {
    const services = (data?.services || []).filter((item) => item.is_active);
    if (!selectedListing) return services.filter((item) => item.service_key === "listing_bump");
    const dealerListing = Boolean(selectedListing.dealer_id) || selectedListing.listing_owner_type === "dealer";
    const isActive = selectedListing.status === "active";
    const publishKey = dealerListing ? "listing_dealer_publish" : "listing_personal_publish";
    const renewKey = dealerListing ? "listing_dealer_renew" : "listing_personal_renew";
    const allowed = isActive ? [renewKey, "listing_bump"] : [publishKey, renewKey];
    return services.filter((item) => allowed.includes(item.service_key));
  }, [data?.services, selectedListing]);

  const profileServices = useMemo(
    () =>
      (data?.services || []).filter(
        (item) =>
          item.is_active &&
          ["professional_profile_6m", "professional_profile_12m"].includes(item.service_key),
      ),
    [data?.services],
  );

  function continueToCheckout(serviceKey: string, override?: { province?: string }) {
    setError("");

    const params = new URLSearchParams({
      type: serviceKey.startsWith("professional_profile_") ? "subscription" : "service",
      service_key: serviceKey,
    });

    if (serviceKey.startsWith("listing_")) {
      if (!selectedListing) {
        setError("ابتدا یک آگهی را انتخاب کنید.");
        return;
      }
      params.set("listing_id", String(selectedListing.id));
      if (selectedListing.dealer_id) params.set("dealer_id", String(selectedListing.dealer_id));
    }

    if (serviceKey.startsWith("professional_profile_")) {
      if (!dealerId) {
        setError("ابتدا یک مجموعه حرفه‌ای را انتخاب کنید.");
        return;
      }
      params.set("dealer_id", String(dealerId));
    }

    const targetProvince = override?.province || province;
    if (targetProvince) params.set("province", targetProvince);
    if (discountCode.trim()) params.set("discount_code", discountCode.trim());

    window.location.assign(`/account/payments/checkout?${params.toString()}`);
  }

  if (loading) {
    return (
      <main className={styles.page} dir="rtl">
        <section className={styles.stateCard}>
          <span className={styles.loader} />
          <h1>در حال آماده‌سازی مرکز خدمات</h1>
          <p>تعرفه‌ها مستقیماً از تنظیمات مدیریت خوانده می‌شوند.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Link href="/account" className={styles.backLink}>← حساب من</Link>
            <span className={styles.eyebrow}>مرکز خدمات و مالی چاکود</span>
            <h1>انتشار، تمدید و تبلیغات</h1>
            <p>محصول را انتخاب کنید؛ سفارش و پرداخت در Checkout واحد ساخته می‌شوند.</p>
          </div>
          <Link href="/" className={styles.logoLink} aria-label="چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        {error && <div className={styles.error}>{error}</div>}
        {data?.payment_gateway_ready === false && (
          <div className={styles.notice}>
            تعرفه‌ها فعال‌اند، اما انتقال بانکی پس از ثبت تنظیمات درگاه در محیط Production انجام می‌شود.
          </div>
        )}

        <nav className={styles.tabs} aria-label="بخش‌های خدمات">
          <button className={activeTab === "listing" ? styles.activeTab : ""} onClick={() => setActiveTab("listing")}>خدمات آگهی</button>
          <button className={activeTab === "profile" ? styles.activeTab : ""} onClick={() => setActiveTab("profile")}>اشتراک حرفه‌ای</button>
          <button className={activeTab === "orders" ? styles.activeTab : ""} onClick={() => setActiveTab("orders")}>سفارش‌ها</button>
        </nav>

        {activeTab !== "orders" && (
          <section className={styles.couponBar}>
            <div><span>کد تخفیف دارید؟</span><small>کد در زمان ساخت سفارش Commerce بررسی می‌شود.</small></div>
            <input dir="ltr" value={discountCode} onChange={(event)=>setDiscountCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,""))} placeholder="مثلاً CHAKOD20" />
            {discountCode && <button type="button" onClick={()=>setDiscountCode("")}>حذف کد</button>}
          </section>
        )}

        {activeTab === "listing" && (
          <section className={styles.contentGrid}>
            <div className={styles.panel}>
              <div className={styles.panelHeading}>
                <div><span>مرحله ۱</span><h2>آگهی را انتخاب کنید</h2></div>
                <Link href="/account/listings">مدیریت آگهی‌ها</Link>
              </div>
              {data?.listings?.length ? (
                <select value={listingId} onChange={(event) => setListingId(Number(event.target.value))} className={styles.select}>
                  {data.listings.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.title} — {listing.status}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={styles.emptyState}>
                  <strong>هنوز آگهی ندارید</strong>
                  <span>ابتدا خودرو را ثبت کنید تا خدمات انتشار و تبلیغ برای آن فعال شود.</span>
                  <Link href="/account/listings/new">ثبت آگهی خودرو</Link>
                </div>
              )}

              {selectedListing && (
                <div className={styles.listingSnapshot}>
                  <div><small>وضعیت</small><strong>{selectedListing.status}</strong></div>
                  <div><small>اعتبار تا</small><strong>{formatDate(selectedListing.expires_at)}</strong></div>
                  <div><small>آخرین بالابر</small><strong>{formatDate(selectedListing.last_bumped_at)}</strong></div>
                </div>
              )}
            </div>

            <div className={styles.serviceArea}>
              <div className={styles.serviceGrid}>
                {listingServices.map((service) => (
                  <article className={styles.serviceCard} key={service.service_key}>
                    <span className={styles.serviceIcon}>
                      {service.service_key.includes("bump") ? "↑" : service.service_key.includes("renew") ? "↻" : "✓"}
                    </span>
                    <h3>{service.title}</h3>
                    <p>{serviceDescriptions[service.service_key] || "خدمت حرفه‌ای چاکود"}</p>
                    <strong>{formatToman(service.amount_toman)}</strong>
                    <button
                      disabled={!selectedListing}
                      onClick={() => continueToCheckout(service.service_key)}
                    >
                      ادامه به پرداخت
                    </button>
                  </article>
                ))}

                <article className={`${styles.serviceCard} ${styles.storyCard}`}>
                  <span className={styles.serviceIcon}>◉</span>
                  <h3>استوری استانی ۲۴ ساعته</h3>
                  <p>نمایش آگهی برای کاربران استان انتخاب‌شده؛ قیمت هر استان جداگانه مدیریت می‌شود.</p>
                  <select value={province} onChange={(event) => setProvince(event.target.value)} className={styles.inlineSelect}>
                    {(data?.provinces || []).filter((item) => item.story_is_active).map((item) => (
                      <option value={item.province} key={item.province}>{item.province}</option>
                    ))}
                  </select>
                  <strong>{formatToman(selectedProvince?.story_price_toman || 0)}</strong>
                  <button
                    disabled={!selectedListing || !selectedProvince}
                    onClick={() => continueToCheckout(
                      selectedProvince?.is_large ? "listing_story_large" : "listing_story_regular",
                      { province },
                    )}
                  >
                    ادامه رزرو استوری
                  </button>
                </article>
              </div>
            </div>
          </section>
        )}

        {activeTab === "profile" && (
          <section className={styles.profileLayout}>
            <div className={styles.panel}>
              <div className={styles.panelHeading}>
                <div><span>نمایش عمومی مجموعه</span><h2>انتخاب مجموعه حرفه‌ای</h2></div>
                <Link href="/account/business">مرکز فرمان مجموعه</Link>
              </div>
              {data?.dealers?.length ? (
                <select value={dealerId} onChange={(event) => setDealerId(Number(event.target.value))} className={styles.select}>
                  {data.dealers.map((dealer) => (
                    <option value={dealer.dealer_id} key={dealer.dealer_id}>{dealer.dealer_name}</option>
                  ))}
                </select>
              ) : (
                <div className={styles.emptyState}>
                  <strong>پروفایل حرفه‌ای پیدا نشد</strong>
                  <span>ابتدا اطلاعات حرفه‌ای مجموعه را در صفحه حساب تکمیل کنید.</span>
                  <Link href="/account">تکمیل پروفایل</Link>
                </div>
              )}
            </div>

            <div className={styles.planGrid}>
              {profileServices.map((service) => (
                <article className={styles.planCard} key={service.service_key}>
                  <span>{service.duration_value} ماه نمایش</span>
                  <h3>{service.title}</h3>
                  <strong>{formatToman(service.amount_toman)}</strong>
                  <ul>
                    <li>صفحه عمومی مجموعه</li>
                    <li>اطلاعات تماس و موقعیت</li>
                    <li>گالری و خدمات مجموعه</li>
                    <li>حفظ اطلاعات پس از انقضا</li>
                  </ul>
                  <button disabled={!dealerId} onClick={() => continueToCheckout(service.service_key)}>
                    انتخاب و ادامه پرداخت
                  </button>
                </article>
              ))}
            </div>

            {data?.subscriptions?.length ? (
              <div className={styles.panel}>
                <div className={styles.panelHeading}><div><span>سوابق</span><h2>اشتراک‌های حرفه‌ای</h2></div></div>
                <div className={styles.subscriptionList}>
                  {data.subscriptions.map((subscription) => (
                    <div key={subscription.id}>
                      <strong>{subscription.service_key}</strong>
                      <span>{statusLabels[subscription.status] || subscription.status}</span>
                      <small>{formatDate(subscription.starts_at)} تا {formatDate(subscription.expires_at)}</small>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        )}

        {activeTab === "orders" && (
          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><span>فاکتورها و تراکنش‌ها</span><h2>سفارش‌های من</h2></div>
              <button className={styles.refreshButton} onClick={() => void load()}>به‌روزرسانی</button>
            </div>
            {data?.orders?.length ? (
              <div className={styles.tableWrap}>
                <table>
                  <thead><tr><th>شماره سفارش</th><th>خدمت</th><th>استان</th><th>مبلغ</th><th>وضعیت</th><th>تاریخ</th></tr></thead>
                  <tbody>
                    {data.orders.map((order) => (
                      <tr key={order.id}>
                        <td dir="ltr">{order.order_no}</td>
                        <td>{order.service_key}</td>
                        <td>{order.province || "—"}</td>
                        <td><strong>{formatToman(order.total_amount_toman)}</strong>{Number(order.discount_amount_toman||0)>0&&<small>{order.discount_code} · {formatToman(Number(order.discount_amount_toman||0))} تخفیف</small>}</td>
                        <td><span className={`${styles.status} ${styles[`status_${order.status}`] || ""}`}>{statusLabels[order.status] || order.status}</span></td>
                        <td>{formatDate(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyState}><strong>سفارشی ثبت نشده است</strong><span>پس از انتخاب یکی از خدمات، سفارش Commerce در اینجا نمایش داده می‌شود.</span></div>
            )}
          </section>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
