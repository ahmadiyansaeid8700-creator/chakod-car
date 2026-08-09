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
import styles from "./ListingDetailDesktop.module.css";

type Props = { listingId: number; initialResponse: ListingApiResponse | null };

function firstText(listing: ListingData, keys: Array<keyof ListingData>, fallback = "") {
  for (const key of keys) {
    const value = listing[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
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
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function normalizePhone(value?: string | null) {
  return value ? value.replace(/[^\d+]/g, "") : "";
}

export default function ListingDetailDesktop({ listingId, initialResponse }: Props) {
  const [response, setResponse] = useState<ListingApiResponse | null>(initialResponse);
  const [loading, setLoading] = useState(!initialResponse);
  const [activeImage, setActiveImage] = useState(0);

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

  if (loading && !response) return <main className={styles.state}>در حال دریافت آگهی…</main>;
  if (!response?.data) {
    return (
      <main className={styles.state}>
        <div><strong>نمایش آگهی ممکن نیست</strong><Link href="/cars">بازگشت به بازار خودرو</Link></div>
      </main>
    );
  }

  const listing = response.data;
  const brand = firstText(listing, ["brand_name", "vehicle_brand", "brand"]);
  const model = firstText(listing, ["model_name", "vehicle_model", "model"]);
  const gearbox = firstText(listing, ["gearbox", "transmission"], "نامشخص");
  const bodyStatus = firstText(listing, ["body_condition", "body_status"]);
  const color = firstText(listing, ["body_color", "color"]);
  const province = firstText(listing, ["province_name", "province"]);
  const city = firstText(listing, ["city_name", "city"]);
  const title = firstText(listing, ["title"]) || [brand, model, listing.production_year ? String(listing.production_year) : ""].filter(Boolean).join(" ") || "آگهی خودرو";
  const subtitle = [brand, model, listing.trim_name].filter(Boolean).join(" ");
  const location = firstText(listing, ["location_label"]) || [province, city, listing.neighborhood].filter(Boolean).join("، ") || "موقعیت ثبت نشده";

  const sellerType = String(listing.seller_type || listing.listing_owner_type || "");
  const isDealer = ["dealer", "showroom", "freezone_operator"].includes(sellerType) || Boolean(listing.dealer_id);
  const sellerName = isDealer
    ? listing.dealer_name || "نمایشگاه عضو چاکود"
    : listing.show_seller_name === false ? "فروشنده شخصی" : listing.seller_display_name || "فروشنده چاکود";
  const dealerVerified = Boolean(listing.dealer_is_verified || listing.dealer_verified || listing.is_dealer_verified);
  const callablePhone = normalizePhone(listing.contact_phone || listing.seller_phone || listing.phone || listing.mobile || "");
  const sellerLogo = isDealer && listing.dealer_logo_url ? normalizeAssetUrl(listing.dealer_logo_url) : "";
  const shareUrl = `/cars/${listing.id}`;
  const reportHref = `/support?topic=report&listing_id=${listing.id}&subject=${encodeURIComponent(`گزارش آگهی شماره ${listing.id}`)}#request`;

  const latitude = Number(listing.latitude);
  const longitude = Number(listing.longitude);
  const hasValidCoords = Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && !(latitude === 0 && longitude === 0);
  const mapUrl = hasValidCoords ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}` : "";

  const publishedAt = formatDate(listing.created_at);
  const updatedAt = formatDate(listing.updated_at);

  const specs = [
    ["سال ساخت", listing.production_year ? formatNumber(listing.production_year) : "—"],
    ["کارکرد", listing.mileage_km === null || listing.mileage_km === undefined ? "—" : Number(listing.mileage_km) === 0 ? "صفر کیلومتر" : `${formatNumber(listing.mileage_km)} کیلومتر`],
    ["گیربکس", gearbox || "—"],
    ["سوخت", listing.fuel_type || "—"],
  ];

  const detailRows = [
    ["برند", brand], ["مدل", model], ["تیپ", listing.trim_name || ""], ["رنگ", color],
    ["وضعیت بدنه", bodyStatus], ["وضعیت فنی", listing.technical_condition || ""],
    ["وضعیت موتور", listing.engine_condition || ""], ["وضعیت شاسی", listing.chassis_condition || ""],
    ["بیمه", listing.insurance_months ? `${formatNumber(listing.insurance_months)} ماه` : ""],
  ].filter((row) => row[1]);

  const safeIndex = Math.min(activeImage, Math.max(images.length - 1, 0));
  const currentImage = images[safeIndex];

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <nav className={styles.breadcrumb}><Link href="/cars">خودروها</Link><span>/</span><strong>{title}</strong></nav>

        <section className={styles.hero}>
          <div className={styles.gallery}>
            <div className={styles.mainImage}>
              {currentImage ? <img src={currentImage.image_url} alt={title} /> : <div className={styles.placeholder}>تصویری ثبت نشده است</div>}
              {images.length > 0 ? <span className={styles.imageCount}>{formatNumber(images.length)} تصویر</span> : null}
            </div>
            {images.length > 1 ? (
              <div className={styles.thumbs}>
                {images.map((image, index) => (
                  <button key={image.id} type="button" onClick={() => setActiveImage(index)} className={index === safeIndex ? styles.activeThumb : ""}>
                    <img src={image.image_url} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <aside className={styles.summary}>
            {listing.is_highlighted ? <span className={styles.highlight}>آگهی ویژه</span> : null}
            <h1>{title}</h1>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}

            <div className={styles.priceBox}>
              <span>قیمت</span>
              <strong>{formatPrice(listing)}</strong>
              {listing.price_is_negotiable ? <small>قابل مذاکره</small> : null}
            </div>

            <div className={styles.locationLine}><span>موقعیت</span><strong>{location}</strong></div>

            <div className={styles.primaryActions}>
              {callablePhone ? <a className={styles.callButton} href={`tel:${callablePhone}`}>تماس با فروشنده</a> : null}
              <SaveListingButton listingId={listing.id} className={styles.actionButton} />
              <ShareListingButton title={title} url={shareUrl} />
              <OwnerStoryVipButton listingId={listing.id} title={title} />
            </div>
          </aside>
        </section>

        <section className={styles.specGrid}>
          {specs.map(([label, value]) => <div className={styles.spec} key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </section>

        <section className={styles.bodyGrid}>
          <div className={styles.mainColumn}>
            {detailRows.length > 0 ? (
              <section className={styles.card}>
                <h2>مشخصات خودرو</h2>
                <div className={styles.detailGrid}>
                  {detailRows.map(([label, value]) => <div className={styles.detailRow} key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}
                </div>
              </section>
            ) : null}

            {listing.description ? <section className={styles.card}><h2>توضیحات فروشنده</h2><p className={styles.description}>{listing.description}</p></section> : null}

            <section className={`${styles.card} ${styles.compactLocation}`}>
              <div><span className={styles.mutedLabel}>موقعیت خودرو</span><strong>{location}</strong></div>
              {mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer">مشاهده مسیر</a> : null}
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.card} id="seller">
              <div className={styles.sellerTop}>
                <div className={styles.avatar}>{sellerLogo ? <img src={sellerLogo} alt={sellerName} /> : sellerName.trim().charAt(0) || "چ"}</div>
                <div><span className={styles.mutedLabel}>{isDealer ? "نمایشگاه" : "فروشنده شخصی"}</span><h2>{sellerName}</h2>{dealerVerified ? <small className={styles.verified}>✓ تأییدشده</small> : null}</div>
              </div>
              {isDealer && listing.dealer_description ? <p className={styles.sellerDescription}>{listing.dealer_description}</p> : null}
              {isDealer && listing.dealer_id ? <Link className={styles.showroomLink} href={`/showrooms/${listing.dealer_id}`}>مشاهده نمایشگاه</Link> : null}
              {callablePhone ? <a className={styles.sellerCall} href={`tel:${callablePhone}`}>تماس با {isDealer ? "نمایشگاه" : "فروشنده"}</a> : null}
              <Link className={styles.reportLink} href={reportHref}>گزارش آگهی</Link>
            </section>

            {(publishedAt || updatedAt) ? (
              <section className={`${styles.card} ${styles.dates}`}>
                {publishedAt ? <div><span>تاریخ انتشار</span><strong>{publishedAt}</strong></div> : null}
                {updatedAt ? <div><span>آخرین به‌روزرسانی</span><strong>{updatedAt}</strong></div> : null}
              </section>
            ) : null}

            <section className={styles.safety}><strong>خرید امن‌تر</strong><span>پیش از پرداخت، خودرو و مدارک را حضوری بررسی کنید.</span></section>
          </aside>
        </section>
      </div>
    </main>
  );
}
