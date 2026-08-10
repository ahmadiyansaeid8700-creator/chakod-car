"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SaveListingButton from "../../components/SaveListingButton";
import ShareListingButton from "./ShareListingButton";
import OwnerStoryVipButton from "./OwnerStoryVipButton";
import {
  collectListingImages,
  fetchListingDetail,
  normalizeAssetUrl,
  type ListingApiResponse,
  type ListingData,
} from "./listing-data";
import styles from "./ListingDetailMobile.module.css";

type Props = {
  listingId: number;
  initialResponse: ListingApiResponse | null;
};

function firstText(listing: ListingData, keys: Array<keyof ListingData>, fallback = "") {
  for (const key of keys) {
    const value = listing[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return fallback;
}

function formatNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat("fa-IR").format(number) : "—";
}

function formatPrice(listing: ListingData) {
  const value = Number(listing.price_toman || 0);
  if (!value) return listing.price_is_negotiable ? "قیمت توافقی" : "قیمت درج نشده";
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function normalizePhone(value?: string | null) {
  return value ? value.replace(/[^\d+]/g, "") : "";
}

export default function ListingDetailMobile({ listingId, initialResponse }: Props) {
  const [response, setResponse] = useState<ListingApiResponse | null>(initialResponse);
  const [loading, setLoading] = useState(!initialResponse);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const syncAssistant = () => {
      const assistant = document.querySelector<HTMLElement>('[data-chakod-ai="assistant"]');
      if (!assistant) return;
      assistant.style.display = media.matches ? "none" : "";
    };

    syncAssistant();
    media.addEventListener("change", syncAssistant);
    return () => {
      media.removeEventListener("change", syncAssistant);
      const assistant = document.querySelector<HTMLElement>('[data-chakod-ai="assistant"]');
      if (assistant) assistant.style.display = "";
    };
  }, []);

  useEffect(() => {
    if (initialResponse) return;
    const controller = new AbortController();
    setLoading(true);
    void fetchListingDetail(listingId, controller.signal)
      .then(setResponse)
      .catch(() => setResponse(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [initialResponse, listingId]);

  const images = useMemo(() => (response ? collectListingImages(response) : []), [response]);
  const usableImages = useMemo(
    () => images.filter((image) => !failedImages.has(image.id)),
    [failedImages, images],
  );

  if (loading && !response) {
    return <main className={styles.loading}>در حال دریافت آگهی…</main>;
  }

  if (!response?.data) {
    return (
      <main className={styles.error}>
        <div>
          <strong>نمایش آگهی ممکن نیست</strong>
          <p>اطلاعات این آگهی در دسترس نیست.</p>
          <Link href="/cars">بازگشت به بازار خودرو</Link>
        </div>
      </main>
    );
  }

  const listing = response.data;
  const brand = firstText(listing, ["brand_name", "vehicle_brand", "brand"]);
  const model = firstText(listing, ["model_name", "vehicle_model", "model"]);
  const gearbox = firstText(listing, ["gearbox", "transmission"], "نامشخص");
  const color = firstText(listing, ["body_color", "color"]);
  const bodyStatus = firstText(listing, ["body_condition", "body_status"]);
  const province = firstText(listing, ["province_name", "province"]);
  const city = firstText(listing, ["city_name", "city"]);
  const title =
    firstText(listing, ["title"]) ||
    [brand, model, listing.production_year ? String(listing.production_year) : ""]
      .filter(Boolean)
      .join(" ") ||
    "آگهی خودرو";
  const subtitle = [brand, model, listing.trim_name].filter(Boolean).join(" ");
  const location =
    firstText(listing, ["location_label"]) ||
    [province, city, listing.neighborhood].filter(Boolean).join("، ") ||
    "موقعیت ثبت نشده";

  const sellerType = String(listing.seller_type || listing.listing_owner_type || "");
  const isDealer = ["dealer", "showroom", "freezone_operator"].includes(sellerType) || Boolean(listing.dealer_id);
  const sellerName = isDealer
    ? listing.dealer_name || "نمایشگاه عضو چاکود"
    : listing.show_seller_name === false
      ? "فروشنده شخصی"
      : listing.seller_display_name || "فروشنده چاکود";
  const dealerVerified = Boolean(
    listing.dealer_is_verified || listing.dealer_verified || listing.is_dealer_verified,
  );
  const callablePhone = normalizePhone(
    listing.contact_phone || listing.seller_phone || listing.phone || listing.mobile || "",
  );
  const sellerLogo = isDealer && listing.dealer_logo_url
    ? normalizeAssetUrl(listing.dealer_logo_url)
    : "";

  const shareUrl = `/cars/${listing.id}`;
  const reportHref = `/support?topic=report&listing_id=${listing.id}&subject=${encodeURIComponent(`گزارش آگهی شماره ${listing.id}`)}#request`;
  const latitude = Number(listing.latitude);
  const longitude = Number(listing.longitude);
  const hasValidCoords =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0);
  const mapUrl = hasValidCoords
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : "";
  const publishedAt = formatDate(listing.created_at);
  const updatedAt = formatDate(listing.updated_at);

  const specs = [
    {
      label: "سال",
      value: listing.production_year ? formatNumber(listing.production_year) : "—",
    },
    {
      label: "کارکرد",
      value:
        listing.mileage_km === null || listing.mileage_km === undefined
          ? "—"
          : Number(listing.mileage_km) === 0
            ? "صفر"
            : `${formatNumber(listing.mileage_km)} کیلومتر`,
    },
    { label: "گیربکس", value: gearbox || "—" },
    { label: "سوخت", value: listing.fuel_type || "—" },
  ];

  const detailRows = [
    ["برند", brand],
    ["مدل", model],
    ["تیپ", listing.trim_name || ""],
    ["رنگ", color],
    ["وضعیت بدنه", bodyStatus],
    ["وضعیت فنی", listing.technical_condition || ""],
    ["وضعیت موتور", listing.engine_condition || ""],
    ["وضعیت شاسی", listing.chassis_condition || ""],
    ["بیمه", listing.insurance_months ? `${formatNumber(listing.insurance_months)} ماه` : ""],
  ].filter((row) => row[1]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.backRow}>
          <Link href="/cars">بازگشت به خودروها</Link>
        </div>

        <section className={styles.gallery} aria-label="تصاویر آگهی">
          {usableImages.length > 0 ? (
            <>
              <div className={styles.galleryTrack}>
                {usableImages.map((image, index) => (
                  <div className={styles.slide} key={image.id}>
                    <img
                      src={image.image_url}
                      alt={`${title} - تصویر ${index + 1}`}
                      loading={index === 0 ? "eager" : "lazy"}
                      decoding="async"
                      onError={() => {
                        setFailedImages((current) => {
                          const next = new Set(current);
                          next.add(image.id);
                          return next;
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
              {usableImages.length > 1 ? (
                <div className={styles.dots} aria-hidden="true">
                  {usableImages.slice(0, 7).map((image) => <i key={image.id} />)}
                </div>
              ) : null}
            </>
          ) : (
            <div className={styles.placeholder}>
              <span aria-hidden="true">▱</span>
              <small>تصویری برای این خودرو ثبت نشده است</small>
            </div>
          )}
        </section>

        <section className={styles.summary}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          <div className={styles.price}>
            <strong>{formatPrice(listing)}</strong>
            {listing.price_is_negotiable ? <span>قابل مذاکره</span> : null}
          </div>

          <div className={styles.metaLine}>
            <span><b>{location}</b></span>
            {mapUrl ? <a className={styles.routeLink} href={mapUrl} target="_blank" rel="noreferrer">مسیر</a> : null}
          </div>

          {(publishedAt || updatedAt) ? (
            <div className={styles.datesLine}>
              {publishedAt ? <span>انتشار: {publishedAt}</span> : null}
              {updatedAt ? <span>به‌روزرسانی: {updatedAt}</span> : null}
            </div>
          ) : null}
        </section>

        <section className={styles.specs} aria-label="مشخصات اصلی خودرو">
          {specs.map((spec) => (
            <div className={styles.spec} key={spec.label}>
              <small>{spec.label}</small>
              <strong>{spec.value}</strong>
            </div>
          ))}
        </section>

        {detailRows.length > 0 ? (
          <details className={styles.details}>
            <summary>مشخصات کامل خودرو</summary>
            <div className={styles.detailRows}>
              {detailRows.map(([label, value]) => (
                <div className={styles.detailRow} key={String(label)}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {listing.description ? (
          <section className={styles.description}>
            <h2 className={styles.sectionTitle}>توضیحات فروشنده</h2>
            <p>{listing.description}</p>
          </section>
        ) : null}

        <section className={styles.seller} id="seller">
          <div className={styles.sellerTop}>
            <div className={styles.avatar}>
              {sellerLogo ? <img src={sellerLogo} alt={sellerName} /> : sellerName.trim().charAt(0) || "چ"}
            </div>
            <div className={styles.sellerName}>
              <strong>{sellerName}</strong>
              <span>{dealerVerified ? "فروشنده تأییدشده چاکود" : isDealer ? "نمایشگاه خودرو" : "فروشنده شخصی"}</span>
            </div>
          </div>
          <div className={styles.sellerLinks}>
            {isDealer && listing.dealer_id ? (
              <Link className={styles.showroomLink} href={`/showrooms/${listing.dealer_id}`}>مشاهده نمایشگاه</Link>
            ) : <span />}
            <Link className={styles.reportLink} href={reportHref}>گزارش آگهی</Link>
          </div>
          <div className={styles.ownerStory}>
            <OwnerStoryVipButton listingId={listing.id} title={title} />
          </div>
        </section>

        <section className={styles.safety}>
          <span className={styles.safetyIcon}>!</span>
          <div>
            <h2 className={styles.sectionTitle}>خرید امن‌تر</h2>
            <p>قبل از پرداخت، خودرو و مدارک را حضوری بررسی کنید.</p>
          </div>
        </section>
      </div>

      <div className={styles.actions}>
        <SaveListingButton listingId={listing.id} compact className={styles.saveButton} />
        <ShareListingButton title={title} url={shareUrl} compact />
        {callablePhone ? (
          <a className={styles.call} href={`tel:${callablePhone}`}>تماس با فروشنده</a>
        ) : null}
      </div>
    </main>
  );
}
