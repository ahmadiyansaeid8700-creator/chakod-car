"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import ListingCard, { type ListingCardData } from "../../components/ListingCard";
import styles from "./page.module.css";

const LISTINGS_API = "https://api.chakod.com/api/listings.php?limit=100&sort=vip";

type BusinessHour = { day: string; enabled: boolean; open: string; close: string };
type Business = {
  id: number;
  slug: string;
  business_type: string;
  business_type_title: string;
  name: string;
  phone: string;
  whatsapp_phone: string;
  email: string;
  website_url: string;
  instagram_url: string;
  province: string;
  city: string;
  neighborhood: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  logo_url: string;
  cover_url: string;
  description: string;
  category_labels: string[];
  services: string[];
  business_hours: BusinessHour[];
  gallery: string[];
  mobile_service: boolean;
  price_range_text: string;
  is_verified: boolean;
};

type DealerListing = ListingCardData & {
  dealer_id?: number | string | null;
};

type ResponseData = { success?: boolean; message?: string; item?: Business };
type ListingsResponse = { success?: boolean; data?: DealerListing[] };

function normalizeText(value: string) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("fa")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[إأ]/g, "ا")
    .replace(/[\u200c\u200f\u202a-\u202e\s\-_/\\،,.]+/g, "");
}

function belongsToDealership(listing: DealerListing, business: Business) {
  if (
    listing.dealer_id !== null &&
    listing.dealer_id !== undefined &&
    String(listing.dealer_id) === String(business.id)
  ) {
    return true;
  }

  return Boolean(
    listing.dealer_name &&
      normalizeText(listing.dealer_name) === normalizeText(business.name),
  );
}

export default function BusinessDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug || "");
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listings, setListings] = useState<DealerListing[]>([]);
  const [listingsStatus, setListingsStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetch(`/api/businesses?slug=${encodeURIComponent(slug)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as ResponseData;
        if (!response.ok || !result.success || !result.item) {
          throw new Error(result.message || "کسب‌وکار پیدا نشد.");
        }
        setBusiness(result.item);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error ? reason.message : "دریافت اطلاعات انجام نشد.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (!business || business.business_type !== "dealer") {
      setListings([]);
      setListingsStatus("idle");
      return;
    }

    const controller = new AbortController();
    setListingsStatus("loading");

    fetch(LISTINGS_API, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = (await response.json()) as ListingsResponse;
        if (!result.success || !Array.isArray(result.data)) {
          throw new Error("Invalid listings response");
        }

        setListings(
          result.data
            .filter((listing) => belongsToDealership(listing, business))
            .slice(0, 24),
        );
        setListingsStatus("ready");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        console.error("dealership-listings-fetch", reason);
        setListings([]);
        setListingsStatus("error");
      });

    return () => controller.abort();
  }, [business]);

  if (loading) {
    return (
      <main className={styles.state} dir="rtl">
        در حال دریافت اطلاعات کسب‌وکار…
      </main>
    );
  }

  if (!business || error) {
    return (
      <main className={styles.state} dir="rtl">
        <strong>{error || "کسب‌وکار پیدا نشد."}</strong>
        <a href="/businesses">بازگشت به فهرست</a>
      </main>
    );
  }

  const location = [business.neighborhood, business.city, business.province]
    .filter(Boolean)
    .join("، ");
  const phone = String(business.phone || "").trim();
  const whatsapp = String(business.whatsapp_phone || "")
    .replace(/\D/g, "")
    .replace(/^0/, "98");
  const hasCoordinates =
    typeof business.latitude === "number" &&
    typeof business.longitude === "number" &&
    Number.isFinite(business.latitude) &&
    Number.isFinite(business.longitude);
  const locationQuery = [business.address, location].filter(Boolean).join(" ").trim();
  const mapHref = hasCoordinates
    ? `https://www.google.com/maps?q=${business.latitude},${business.longitude}`
    : locationQuery
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`
      : "";

  return (
    <main className={styles.page} dir="rtl">
      <header className={styles.header}>
        <a href="/">
          <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
        </a>
        <nav>
          <button type="button" onClick={() => window.history.back()}>
            بازگشت
          </button>
          <a href="/businesses">همه کسب‌وکارها</a>
          <a href="/account/business/new">ثبت کسب‌وکار</a>
          <a href="/">صفحه اصلی</a>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.cover}>
          {business.cover_url ? (
            <img src={business.cover_url} alt="" />
          ) : (
            <span />
          )}
        </div>
        <div className={styles.identity}>
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} />
          ) : (
            <b>{business.name.slice(0, 1)}</b>
          )}
          <div>
            <span>{business.business_type_title}</span>
            <h1>{business.name}</h1>
            <p>{location}</p>
          </div>
          {business.is_verified && <em>کسب‌وکار تأییدشده چاکود</em>}
        </div>
      </section>

      <div className={styles.layout}>
        <article className={styles.content}>
          <section>
            <h2>درباره مجموعه</h2>
            <p>
              {business.description || "توضیحی برای این مجموعه ثبت نشده است."}
            </p>
          </section>

          <section>
            <h2>زمینه فعالیت و خدمات</h2>
            <div className={styles.tags}>
              {[...business.category_labels, ...business.services].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            {business.mobile_service && (
              <div className={styles.mobileBadge}>
                این مجموعه خدمات در محل ارائه می‌دهد.
              </div>
            )}
          </section>

          {business.business_type === "dealer" && (
            <section className={styles.listingsSection}>
              <div className={styles.listingsHeader}>
                <div>
                  <span>موجودی فعال</span>
                  <h2>خودروهای این نمایشگاه</h2>
                </div>
                {listingsStatus === "ready" && (
                  <strong>
                    {new Intl.NumberFormat("fa-IR").format(listings.length)} آگهی
                  </strong>
                )}
              </div>

              {listingsStatus === "loading" ? (
                <div className={styles.listingsState}>در حال دریافت خودروها…</div>
              ) : listingsStatus === "error" ? (
                <div className={styles.listingsState}>
                  دریافت موجودی نمایشگاه موقتاً انجام نشد.
                </div>
              ) : listings.length > 0 ? (
                <div className={styles.listingsGrid}>
                  {listings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      variant="grid"
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.listingsState}>
                  در حال حاضر آگهی فعالی برای این نمایشگاه ثبت نشده است.
                </div>
              )}
            </section>
          )}

          {business.gallery.length > 0 && (
            <section>
              <h2>تصاویر و نمونه‌کارها</h2>
              <div className={styles.gallery}>
                {business.gallery.map((image) => (
                  <img key={image} src={image} alt={`نمونه‌کار ${business.name}`} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2>ساعات کاری</h2>
            <div className={styles.hours}>
              {business.business_hours.length ? (
                business.business_hours.map((row) => (
                  <div key={row.day}>
                    <strong>{row.day}</strong>
                    <span>
                      {row.enabled ? `${row.open} تا ${row.close}` : "تعطیل"}
                    </span>
                  </div>
                ))
              ) : (
                <p>ساعات کاری ثبت نشده است.</p>
              )}
            </div>
          </section>
        </article>

        <aside className={styles.sidebar}>
          <div>
            <span>نشانی</span>
            <strong>{business.address || location || "ثبت نشده"}</strong>
          </div>
          {business.price_range_text && (
            <div>
              <span>محدوده قیمت</span>
              <strong>{business.price_range_text}</strong>
            </div>
          )}
          {phone ? (
            <a className={styles.primary} href={`tel:${phone}`}>
              تماس با مجموعه
            </a>
          ) : null}
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noreferrer"
            >
              ارتباط در واتساپ
            </a>
          )}
          {mapHref ? (
            <a href={mapHref} target="_blank" rel="noreferrer">
              مسیریابی روی نقشه
            </a>
          ) : null}
          {business.instagram_url && (
            <a href={business.instagram_url} target="_blank" rel="noreferrer">
              اینستاگرام
            </a>
          )}
          {business.website_url && (
            <a href={business.website_url} target="_blank" rel="noreferrer">
              وب‌سایت
            </a>
          )}
        </aside>
      </div>
    </main>
  );
}
