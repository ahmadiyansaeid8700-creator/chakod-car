"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  isDealerListing,
  isUsableListingPhone,
  normalizeListingPhone,
  publicSellerName,
} from "../../../lib/listing-publication-policy";
import SaveListingButton from "../../components/SaveListingButton";
import OwnerStoryVipButton from "./OwnerStoryVipButton";
import ShareListingButton from "./ShareListingButton";
import {
  collectListingImages,
  fetchListingDetail,
  normalizeAssetUrl,
  type ListingApiResponse,
  type ListingData,
} from "./listing-data";
import styles from "./ListingDetailExperience.module.css";

type Props = {
  listingId: number;
  initialResponse: ListingApiResponse | null;
};

type GalleryImage = ReturnType<typeof collectListingImages>[number];

function text(listing: ListingData, keys: Array<keyof ListingData>) {
  for (const key of keys) {
    const value = listing[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function faNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat("fa-IR").format(number) : "—";
}

function priceLabel(listing: ListingData) {
  const price = Number(listing.price_toman || 0);
  if (price > 0) return `${new Intl.NumberFormat("fa-IR").format(price)} تومان`;
  return listing.price_is_negotiable ? "قیمت توافقی" : "قیمت درج نشده";
}

function dateLabel(value?: string | null) {
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

function Gallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());

  const usableImages = images.filter((image) => !failed.has(image.id));
  const safeIndex = Math.min(activeIndex, Math.max(usableImages.length - 1, 0));
  const current = usableImages[safeIndex];

  useEffect(() => {
    if (activeIndex > usableImages.length - 1) setActiveIndex(0);
  }, [activeIndex, usableImages.length]);

  if (!current) {
    return (
      <section className={styles.gallery} aria-label="تصاویر آگهی">
        <div className={styles.placeholder}>
          <svg viewBox="0 0 84 52" aria-hidden="true">
            <path d="M14 35h56l-5-13c-1-3-4-5-8-5H30c-4 0-7 2-9 5l-7 13Z" />
            <path d="M10 35h64v7H10z" />
            <circle cx="27" cy="43" r="5" />
            <circle cx="59" cy="43" r="5" />
          </svg>
          <span>تصویری برای این خودرو ثبت نشده است</span>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.gallery} aria-label="تصاویر آگهی">
      <div className={styles.mainImage}>
        <img
          src={current.image_url}
          alt={title}
          onError={() => setFailed((currentFailed) => new Set(currentFailed).add(current.id))}
        />
        {usableImages.length > 1 ? (
          <span className={styles.imageCounter}>
            {faNumber(safeIndex + 1)} / {faNumber(usableImages.length)}
          </span>
        ) : null}
      </div>

      {usableImages.length > 1 ? (
        <div className={styles.thumbs}>
          {usableImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className={index === safeIndex ? styles.activeThumb : ""}
              onClick={() => setActiveIndex(index)}
              aria-label={`تصویر ${index + 1}`}
            >
              <img
                src={image.image_url}
                alt=""
                onError={() => setFailed((currentFailed) => new Set(currentFailed).add(image.id))}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function ListingDetailExperience({ listingId, initialResponse }: Props) {
  const [response, setResponse] = useState<ListingApiResponse | null>(initialResponse);
  const [loading, setLoading] = useState(!initialResponse);

  useEffect(() => {
    document.body.dataset.chakodListingDetail = "true";
    return () => {
      delete document.body.dataset.chakodListingDetail;
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

  if (loading && !response) {
    return <main className={styles.state}>در حال دریافت آگهی…</main>;
  }

  if (!response?.data) {
    return (
      <main className={styles.state}>
        <div>
          <strong>این آگهی در دسترس نیست</strong>
          <Link href="/cars">بازگشت به بازار خودرو</Link>
        </div>
      </main>
    );
  }

  const listing = response.data;
  const brand = text(listing, ["brand_name", "vehicle_brand", "brand"]);
  const model = text(listing, ["model_name", "vehicle_model", "model"]);
  const gearbox = text(listing, ["gearbox", "transmission"]);
  const color = text(listing, ["body_color", "color"]);
  const bodyStatus = text(listing, ["body_condition", "body_status"]);
  const province = text(listing, ["province_name", "province"]);
  const city = text(listing, ["city_name", "city"]);
  const title =
    text(listing, ["title"]) ||
    [brand, model, listing.production_year ? String(listing.production_year) : ""]
      .filter(Boolean)
      .join(" ") ||
    "آگهی خودرو";
  const subtitle = [brand, model, listing.trim_name].filter(Boolean).join(" ");
  const location =
    text(listing, ["location_label"]) ||
    [province, city, listing.neighborhood].filter(Boolean).join("، ") ||
    "موقعیت ثبت نشده";

  const isDealer = isDealerListing(listing);
  const sellerName = publicSellerName(listing);
  const sellerLogo = isDealer && listing.dealer_logo_url ? normalizeAssetUrl(listing.dealer_logo_url) : "";
  const dealerVerified = Boolean(
    listing.dealer_is_verified || listing.dealer_verified || listing.is_dealer_verified,
  );

  const phone = normalizeListingPhone(
    listing.contact_phone || listing.seller_phone || listing.phone || listing.mobile || "",
  );

  if (!isUsableListingPhone(phone)) {
    return (
      <main className={styles.state}>
        <div>
          <strong>این آگهی در دسترس نیست</strong>
          <span>آگهی کامل نشده است.</span>
          <Link href="/cars">بازگشت به بازار خودرو</Link>
        </div>
      </main>
    );
  }

  const latitude = Number(listing.latitude);
  const longitude = Number(listing.longitude);
  const hasCoords =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0);
  const mapUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : "";

  const publishedAt = dateLabel(listing.created_at);
  const updatedAt = dateLabel(listing.updated_at);
  const freshness = [
    publishedAt ? `انتشار ${publishedAt}` : "",
    updatedAt && updatedAt !== publishedAt ? `آخرین بروزرسانی ${updatedAt}` : "",
  ].filter(Boolean);

  const mainSpecs = [
    ["سال", listing.production_year ? faNumber(listing.production_year) : "—"],
    [
      "کارکرد",
      listing.mileage_km === null || listing.mileage_km === undefined
        ? "—"
        : Number(listing.mileage_km) === 0
          ? "صفر کیلومتر"
          : `${faNumber(listing.mileage_km)} کیلومتر`,
    ],
    ["گیربکس", gearbox || "—"],
    ["سوخت", listing.fuel_type || "—"],
  ];

  const extraSpecs = [
    ["برند", brand],
    ["مدل", model],
    ["تیپ", listing.trim_name || ""],
    ["رنگ", color],
    ["وضعیت بدنه", bodyStatus],
    ["وضعیت فنی", listing.technical_condition || ""],
    ["وضعیت موتور", listing.engine_condition || ""],
    ["وضعیت شاسی", listing.chassis_condition || ""],
    ["بیمه", listing.insurance_months ? `${faNumber(listing.insurance_months)} ماه` : ""],
  ].filter((item) => item[1]);

  const shareUrl = `/cars/${listing.id}`;
  const reportHref = `/support?topic=report&listing_id=${listing.id}&subject=${encodeURIComponent(`گزارش آگهی شماره ${listing.id}`)}#request`;

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <div className={styles.backRow}>
          <Link href="/cars">بازگشت به خودروها</Link>
        </div>

        <div className={styles.hero}>
          <Gallery images={images} title={title} />

          <section className={styles.summary}>
            <div>
              <h1>{title}</h1>
              {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
            </div>

            <strong className={styles.price}>{priceLabel(listing)}</strong>

            <div className={styles.locationRow}>
              <span>{location}</span>
              {mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer">مسیر</a> : null}
            </div>

            {freshness.length > 0 ? (
              <div className={styles.freshness}>
                {freshness.map((item) => <span key={item}>{item}</span>)}
              </div>
            ) : null}

            <div className={styles.desktopActions}>
              <a className={styles.callButton} href={`tel:${phone}`}>تماس با فروشنده</a>
              <SaveListingButton listingId={listing.id} className={styles.desktopSave} />
              <ShareListingButton title={title} url={shareUrl} />
            </div>
          </section>
        </div>

        <section className={styles.specGrid} aria-label="مشخصات اصلی خودرو">
          {mainSpecs.map(([label, value]) => (
            <div key={String(label)} className={styles.spec}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>

        <div className={styles.contentGrid}>
          <div className={styles.mainColumn}>
            {extraSpecs.length > 0 ? (
              <details className={styles.details}>
                <summary>مشخصات کامل خودرو</summary>
                <div className={styles.detailGrid}>
                  {extraSpecs.map(([label, value]) => (
                    <div className={styles.detailRow} key={String(label)}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

            {listing.description ? (
              <section className={styles.card}>
                <h2>توضیحات فروشنده</h2>
                <p className={styles.description}>{listing.description}</p>
              </section>
            ) : null}
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.sellerCard} id="seller">
              <div className={styles.sellerIdentity}>
                <div className={styles.avatar}>
                  {sellerLogo ? <img src={sellerLogo} alt={sellerName} /> : sellerName.trim().charAt(0) || "چ"}
                </div>
                <div>
                  <strong>{sellerName}</strong>
                  {isDealer ? (
                    <span>{dealerVerified ? "فروشنده تأییدشده" : "نمایشگاه خودرو"}</span>
                  ) : null}
                </div>
              </div>

              {isDealer && listing.dealer_id ? (
                <Link href={`/showrooms/${listing.dealer_id}`} className={styles.showroomLink}>
                  مشاهده نمایشگاه
                </Link>
              ) : null}

              <div className={styles.ownerTools}>
                <OwnerStoryVipButton listingId={listing.id} title={title} />
              </div>

              <Link href={reportHref} className={styles.reportLink}>گزارش آگهی</Link>
            </section>
          </aside>
        </div>
      </div>

      <div className={styles.mobileActions}>
        <SaveListingButton listingId={listing.id} compact className={styles.mobileIconButton} />
        <ShareListingButton title={title} url={shareUrl} compact />
        <a className={styles.mobileCall} href={`tel:${phone}`}>تماس با فروشنده</a>
      </div>
    </main>
  );
}
