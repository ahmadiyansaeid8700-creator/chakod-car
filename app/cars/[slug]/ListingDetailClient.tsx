"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import SaveListingButton from "../../components/SaveListingButton";
import ShareListingButton from "./ShareListingButton";
import StoryVipButton from "./StoryVipButton";
import {
  collectListingImages,
  fetchListingDetail,
  fetchListingSummary,
  mergeListingResponses,
  normalizeAssetUrl,
  type ListingApiResponse,
  type ListingData,
} from "./listing-data";
import styles from "./page.module.css";

type Props = {
  listingId: number;
  initialResponse: ListingApiResponse | null;
};

type GalleryImage = ReturnType<typeof collectListingImages>[number];

function firstText(listing: ListingData, keys: Array<keyof ListingData>, fallback = "") {
  for (const key of keys) {
    const value = listing[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return fallback;
}

function toFiniteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value: unknown) {
  const number = toFiniteNumber(value);
  return number === null ? "—" : new Intl.NumberFormat("fa-IR").format(number);
}

function formatPrice(listing: ListingData) {
  const price = toFiniteNumber(listing.price_toman);
  if (price !== null && price > 0) {
    return `${new Intl.NumberFormat("fa-IR").format(price)} تومان`;
  }
  return listing.price_is_negotiable ? "توافقی" : "قیمت درج نشده";
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

function SpecCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <article className={styles.specCard}>
      <span className={styles.specIcon} aria-hidden="true">{icon}</span>
      <div>
        <span className={styles.specTitle}>{title}</span>
        <strong className={styles.specValue}>{value}</strong>
      </div>
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CarPlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.imagePlaceholder} ${compact ? styles.compactPlaceholder : ""}`}>
      <svg viewBox="0 0 180 90" aria-hidden="true">
        <path d="M26 58h128l-10-24c-2-6-8-10-15-10H62c-7 0-13 4-16 10L26 58Z" />
        <path d="M18 59h144v12H18z" />
        <circle cx="54" cy="72" r="11" />
        <circle cx="128" cy="72" r="11" />
        <path d="M60 32h62l12 26H45l15-26Z" />
      </svg>
      <p>تصویر خودرو ثبت نشده است</p>
    </div>
  );
}

function ListingGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const usableImages = images.filter((image) => !failed.has(image.id));
  const safeIndex = Math.min(activeIndex, Math.max(usableImages.length - 1, 0));
  const activeImage = usableImages[safeIndex];

  useEffect(() => {
    if (activeIndex > usableImages.length - 1) setActiveIndex(0);
  }, [activeIndex, usableImages.length]);

  function markFailed(id: string) {
    setFailed((current) => new Set(current).add(id));
  }

  function move(direction: -1 | 1) {
    if (usableImages.length < 2) return;
    setActiveIndex((current) => (current + direction + usableImages.length) % usableImages.length);
  }

  if (!activeImage) return <CarPlaceholder />;

  return (
    <div className={styles.galleryStage}>
      <div className={styles.galleryMain}>
        <img
          key={activeImage.id}
          src={activeImage.image_url}
          alt={`${title} - تصویر ${safeIndex + 1}`}
          decoding="async"
          fetchPriority="high"
          onError={() => markFailed(activeImage.id)}
        />

        <div className={styles.imageCount}>
          <span aria-hidden="true">▧</span>
          {formatNumber(usableImages.length)} تصویر
        </div>

        {usableImages.length > 1 ? (
          <div className={styles.galleryControls}>
            <button type="button" onClick={() => move(-1)} aria-label="تصویر قبلی">›</button>
            <button type="button" onClick={() => move(1)} aria-label="تصویر بعدی">‹</button>
          </div>
        ) : null}
      </div>

      {usableImages.length > 1 ? (
        <div className={styles.thumbnailRow} aria-label="تصاویر آگهی">
          {usableImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className={`${styles.thumbnail} ${index === safeIndex ? styles.thumbnailActive : ""}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`مشاهده تصویر ${index + 1}`}
              aria-current={index === safeIndex ? "true" : undefined}
            >
              <img
                src={image.image_url}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => markFailed(image.id)}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LoadingState() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.container}>
        <div className={styles.loadingBreadcrumb} />
        <section className={styles.loadingHero}>
          <div className={`${styles.loadingBlock} ${styles.loadingGallery}`} />
          <div className={`${styles.loadingBlock} ${styles.loadingSummary}`}>
            <span /><span /><span /><span />
          </div>
        </section>
        <div className={styles.loadingSpecs}>
          <span /><span /><span /><span />
        </div>
      </div>
    </main>
  );
}

export default function ListingDetailClient({ listingId, initialResponse }: Props) {
  const [response, setResponse] = useState<ListingApiResponse | null>(initialResponse);
  const [loading, setLoading] = useState(!initialResponse);
  const [error, setError] = useState("");

  const loadListing = useCallback(async () => {
    const detailController = new AbortController();
    const summaryController = new AbortController();
    const detailTimeout = window.setTimeout(() => detailController.abort(), 12000);
    const summaryTimeout = window.setTimeout(() => summaryController.abort(), 8000);
    setLoading(true);
    setError("");

    const detailPromise = fetchListingDetail(listingId, detailController.signal)
      .then((value) => ({ source: "detail" as const, value }));
    const summaryPromise = fetchListingSummary(listingId, summaryController.signal)
      .then((value) => ({ source: "summary" as const, value }));

    try {
      const first = await Promise.any([detailPromise, summaryPromise]);
      setResponse(first.value);
      setLoading(false);

      if (first.source === "summary") {
        void detailPromise
          .then((detail) => setResponse(mergeListingResponses(detail.value, first.value)))
          .catch(() => undefined);
      } else {
        void summaryPromise
          .then((summary) => setResponse((current) =>
            current ? mergeListingResponses(current, summary.value) : summary.value,
          ))
          .catch(() => undefined);
      }
    } catch (loadError) {
      const message =
        loadError instanceof AggregateError
          ? "دریافت آگهی از سرور اصلی و فهرست عمومی انجام نشد. دوباره تلاش کنید."
          : loadError instanceof DOMException && loadError.name === "AbortError"
            ? "پاسخ سرور بیش از حد طول کشید. دوباره تلاش کنید."
            : loadError instanceof Error
              ? loadError.message
              : "خطایی هنگام دریافت آگهی رخ داد.";
      setError(message);
      setResponse(null);
    } finally {
      window.clearTimeout(detailTimeout);
      window.clearTimeout(summaryTimeout);
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (!initialResponse) void loadListing();
  }, [initialResponse, loadListing]);

  const images = useMemo(() => (response ? collectListingImages(response) : []), [response]);

  if (loading && !response) return <LoadingState />;

  if (!response?.data) {
    return (
      <main className={styles.errorPage}>
        <section className={styles.errorCard}>
          <span className={styles.errorIcon}>!</span>
          <h1>نمایش آگهی ممکن نیست</h1>
          <p>{error || "اطلاعات این آگهی در دسترس نیست."}</p>
          <div className={styles.errorActions}>
            <button type="button" className={styles.retryButton} onClick={() => void loadListing()}>
              تلاش دوباره
            </button>
            <Link href="/cars" className={styles.primaryLink}>بازگشت به خودروها</Link>
          </div>
        </section>
      </main>
    );
  }

  const listing = response.data;
  const title =
    firstText(listing, ["title"]) ||
    [
      firstText(listing, ["brand_name", "vehicle_brand", "brand"]),
      firstText(listing, ["model_name", "vehicle_model", "model"]),
      listing.production_year ? String(listing.production_year) : "",
    ].filter(Boolean).join(" ") ||
    "آگهی خودرو در چاکود";

  const brand = firstText(listing, ["brand_name", "vehicle_brand", "brand"]);
  const model = firstText(listing, ["model_name", "vehicle_model", "model"]);
  const gearbox = firstText(listing, ["gearbox", "transmission"]);
  const bodyStatus = firstText(listing, ["body_condition", "body_status"]);
  const color = firstText(listing, ["body_color", "color"]);
  const province = firstText(listing, ["province_name", "province"]);
  const city = firstText(listing, ["city_name", "city"]);
  const locationLabel =
    firstText(listing, ["location_label"]) ||
    [province, city, listing.neighborhood].filter(Boolean).join("، ");

  const sellerType = String(listing.seller_type || listing.listing_owner_type || "");
  const isDealer = ["dealer", "showroom", "freezone_operator"].includes(sellerType) || Boolean(listing.dealer_id);
  const canShowName = listing.show_seller_name === undefined || Boolean(listing.show_seller_name);
  const sellerName = isDealer
    ? listing.dealer_name || "نمایشگاه عضو چاکود"
    : canShowName
      ? listing.seller_display_name || "فروشنده چاکود"
      : "فروشنده شخصی";

  const callablePhone = normalizePhone(
    listing.contact_phone || listing.seller_phone || listing.phone || listing.mobile || "",
  );
  const dealerVerified = Boolean(
    listing.dealer_is_verified || listing.dealer_verified || listing.is_dealer_verified,
  );
  const shareUrl = `/cars/${listing.id}`;
  const latitude = toFiniteNumber(listing.latitude);
  const longitude = toFiniteNumber(listing.longitude);
  const mapUrl =
    latitude !== null && longitude !== null
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : "";

  const specs = [
    { title: "سال ساخت", value: listing.production_year ? formatNumber(listing.production_year) : "نامشخص", icon: "◷" },
    {
      title: "کارکرد",
      value:
        listing.mileage_km !== null && listing.mileage_km !== undefined
          ? Number(listing.mileage_km) === 0
            ? "صفر کیلومتر"
            : `${formatNumber(listing.mileage_km)} کیلومتر`
          : "نامشخص",
      icon: "⌁",
    },
    { title: "گیربکس", value: gearbox || "نامشخص", icon: "⚙" },
    { title: "سوخت", value: listing.fuel_type || "نامشخص", icon: "◇" },
  ];

  const technicalRows = [
    { label: "برند", value: brand },
    { label: "مدل", value: model },
    { label: "تیپ", value: listing.trim_name || "" },
    { label: "سال تولید", value: listing.production_year ? formatNumber(listing.production_year) : "" },
    {
      label: "کارکرد",
      value:
        listing.mileage_km !== null && listing.mileage_km !== undefined
          ? `${formatNumber(listing.mileage_km)} کیلومتر`
          : "",
    },
    { label: "رنگ", value: color },
    { label: "نوع گیربکس", value: gearbox },
    { label: "نوع سوخت", value: listing.fuel_type || "" },
    { label: "وضعیت بدنه", value: bodyStatus },
    { label: "وضعیت فنی", value: listing.technical_condition || "" },
    { label: "وضعیت موتور", value: listing.engine_condition || "" },
    { label: "وضعیت شاسی", value: listing.chassis_condition || "" },
    {
      label: "بیمه",
      value: listing.insurance_months ? `${formatNumber(listing.insurance_months)} ماه` : "",
    },
  ].filter((item) => item.value);

  const createdDate = formatDate(listing.created_at);
  const updatedDate = formatDate(listing.updated_at);
  const aiScore = toFiniteNumber(listing.ai_quality_score) ?? toFiniteNumber(listing.ai_confidence);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
          <Link href="/">خانه</Link><span>/</span>
          <Link href="/cars">خودروها</Link><span>/</span>
          <strong>{title}</strong>
        </nav>

        <section className={styles.heroGrid}>
          <div className={styles.galleryCard}>
            <ListingGallery images={images} title={title} />
          </div>

          <aside className={styles.summaryCard}>
            <div className={styles.badgeRow}>
              <span className={styles.approvedBadge}><span aria-hidden="true">✓</span> منتشرشده در چاکود</span>
              {listing.is_highlighted ? <span className={styles.featuredBadge}>آگهی ویژه</span> : null}
              <span className={styles.ownerBadge}>{isDealer ? "نمایشگاهی" : "شخصی"}</span>
              {listing.category_name ? <span className={styles.categoryBadge}>{listing.category_name}</span> : null}
            </div>

            <h1>{title}</h1>
            <p className={styles.vehicleSubtitle}>
              {[brand, model, listing.trim_name].filter(Boolean).join(" ") || "خودرو"}
            </p>

            <div className={styles.priceBox}>
              <span>قیمت اعلام‌شده</span>
              <strong>{formatPrice(listing)}</strong>
              {listing.price_is_negotiable ? <small>امکان مذاکره با فروشنده</small> : null}
            </div>

            <div className={styles.quickMeta}>
              <span><b>{formatNumber(listing.views_count || 0)}</b>بازدید</span>
              <span><b>{formatNumber(listing.favorite_count || 0)}</b>نشان‌شده</span>
              <span><b>{city || province || "نامشخص"}</b>موقعیت</span>
            </div>

            <div className={styles.desktopActions}>
              <a href={callablePhone ? `tel:${callablePhone}` : "#seller"} className={styles.callButton}>
                {callablePhone ? "تماس با فروشنده" : "مشاهده اطلاعات فروشنده"}
              </a>
              <div className={styles.secondaryActions}>
                <SaveListingButton listingId={listing.id} className={styles.saveButton} />
                <ShareListingButton title={title} url={shareUrl} />
                <StoryVipButton listingId={listing.id} title={title} />
              </div>
            </div>

            <p className={styles.summaryNotice}>
              اطلاعات این صفحه توسط آگهی‌دهنده ثبت شده است. پیش از خرید، بازدید حضوری و کارشناسی مستقل انجام دهید.
            </p>
          </aside>
        </section>

        <section className={styles.specGrid}>
          {specs.map((spec) => <SpecCard key={spec.title} {...spec} />)}
        </section>

        <section className={styles.chakodTrustCard}>
          <div className={styles.trustLogo}>چ</div>
          <div className={styles.trustContent}>
            <span className={styles.eyebrow}>ویترین حرفه‌ای چاکود</span>
            <h2>اطلاعات مهم خودرو، یکجا و خوانا</h2>
            <p>مشخصات، تصاویر، موقعیت و هویت فروشنده در یک صفحه رسمی و قابل اشتراک ارائه شده‌اند.</p>
          </div>
          <div className={styles.trustItems}>
            <span>✓ ساختار استاندارد آگهی</span>
            <span>✓ اطلاعات شفاف فروشنده</span>
            <span>✓ لینک رسمی اشتراک‌گذاری</span>
          </div>
        </section>

        <div className={styles.contentGrid}>
          <div className={styles.mainColumn}>
            {technicalRows.length > 0 ? (
              <section className={styles.contentCard}>
                <div className={styles.sectionHeader}>
                  <div><span className={styles.eyebrow}>مشخصات خودرو</span><h2>اطلاعات فنی و ظاهری</h2></div>
                </div>
                <div className={styles.detailGrid}>
                  {technicalRows.map((item) => <DetailRow key={item.label} {...item} />)}
                </div>
              </section>
            ) : null}

            <section className={styles.contentCard}>
              <div className={styles.sectionHeader}>
                <div><span className={styles.eyebrow}>توضیحات فروشنده</span><h2>معرفی این خودرو</h2></div>
              </div>
              <div className={styles.description}>
                {listing.description ? (
                  listing.description.split(/\r?\n/).filter(Boolean).map((line, index) => <p key={`${index}-${line}`}>{line}</p>)
                ) : (
                  <p>توضیح تکمیلی برای این آگهی ثبت نشده است. برای دریافت جزئیات بیشتر با فروشنده تماس بگیرید.</p>
                )}
              </div>
            </section>

            <section className={styles.contentCard}>
              <div className={styles.sectionHeader}>
                <div><span className={styles.eyebrow}>موقعیت خودرو</span><h2>{locationLabel || "موقعیت ثبت نشده"}</h2></div>
              </div>
              <div className={styles.locationPanel}>
                <div className={styles.locationPin}>⌖</div>
                <div className={styles.locationText}>
                  <strong>{locationLabel || "فروشنده هنوز محدوده خودرو را مشخص نکرده است."}</strong>
                  <p>برای حفظ حریم خصوصی، محل دقیق خودرو را پیش از مراجعه با فروشنده هماهنگ کنید.</p>
                </div>
                {mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer" className={styles.mapButton}>مشاهده مسیر</a> : null}
              </div>
            </section>

            <section className={styles.contentCard}>
              <div className={styles.sectionHeader}>
                <div><span className={styles.eyebrow}>کنترل کیفیت</span><h2>وضعیت اطلاعات آگهی</h2></div>
                {aiScore !== null ? <span className={styles.scoreBadge}>{formatNumber(Math.round(aiScore))} از ۱۰۰</span> : null}
              </div>
              <div className={styles.reviewGrid}>
                <div><span>وضعیت انتشار</span><strong>فعال</strong></div>
                <div><span>نوع آگهی‌دهنده</span><strong>{isDealer ? "نمایشگاه" : "فروشنده شخصی"}</strong></div>
                <div><span>تصاویر</span><strong>{formatNumber(images.length)} تصویر</strong></div>
                <div><span>سطح نمایش</span><strong>{listing.plan_name || "عادی"}</strong></div>
              </div>
              <p className={styles.reviewDisclaimer}>
                کنترل محتوای چاکود جایگزین کارشناسی فنی، حقوقی یا بررسی اصالت خودرو نیست.
              </p>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.sellerCard} id="seller">
              <div className={styles.sellerCardTop}>
                {isDealer && listing.dealer_logo_url ? (
                  <img className={styles.sellerLogo} src={normalizeAssetUrl(listing.dealer_logo_url)} alt={sellerName} />
                ) : (
                  <div className={styles.sellerAvatar}>{sellerName.trim().charAt(0) || "چ"}</div>
                )}
                <div>
                  <span className={styles.eyebrow}>{isDealer ? "نمایشگاه عرضه‌کننده" : "فروشنده آگهی"}</span>
                  <h2>{sellerName}</h2>
                  <div className={styles.verificationRow}>
                    {dealerVerified ? <span className={styles.verifiedBadge}>✓ نمایشگاه تأییدشده</span> : <span className={styles.memberBadge}>عضو چاکود</span>}
                  </div>
                </div>
              </div>

              <p className={styles.sellerDescription}>
                {isDealer && listing.dealer_description
                  ? listing.dealer_description
                  : "این آگهی‌دهنده خودروی خود را از طریق ویترین حرفه‌ای چاکود معرفی کرده است."}
              </p>

              <div className={styles.sellerIdentity}>
                <span>نوع انتشار</span><strong>{isDealer ? "نمایشگاهی" : "آگهی شخصی"}</strong>
              </div>

              {isDealer && listing.dealer_id ? (
                <Link href={`/showrooms/${listing.dealer_id}`} className={styles.showroomLink}>مشاهده ویترین نمایشگاه</Link>
              ) : null}

              {callablePhone ? (
                <a href={`tel:${callablePhone}`} className={styles.sellerCallButton}>تماس با {isDealer ? "نمایشگاه" : "فروشنده"}</a>
              ) : (
                <div className={styles.noPhone}>شماره تماس برای این آگهی منتشر نشده است.</div>
              )}
              <p className={styles.prideText}>این فروشنده با افتخار در چاکود حضور دارد.</p>
            </section>

            <section className={styles.sideInfoCard}>
              <h3>اطلاعات انتشار</h3>
              <DetailRow label="شماره آگهی" value={formatNumber(listing.id)} />
              {createdDate ? <DetailRow label="تاریخ انتشار" value={createdDate} /> : null}
              {updatedDate && updatedDate !== createdDate ? <DetailRow label="آخرین به‌روزرسانی" value={updatedDate} /> : null}
              <DetailRow label="تعداد بازدید" value={formatNumber(listing.views_count || 0)} />
              <DetailRow label="نوع آگهی" value={isDealer ? "نمایشگاهی" : "شخصی"} />
              {listing.category_name ? <DetailRow label="دسته‌بندی" value={listing.category_name} /> : null}
            </section>

            <section className={styles.safetyCard}>
              <span className={styles.safetyIcon}>!</span>
              <div><h3>خرید امن‌تر</h3><p>پیش از پرداخت، خودرو و مدارک را حضوری بررسی کنید و بدون قرارداد معتبر وجهی انتقال ندهید.</p></div>
            </section>
          </aside>
        </div>
      </div>

      <div className={styles.mobileActionBar}>
        <SaveListingButton listingId={listing.id} compact className={styles.mobileSaveButton} />
        <ShareListingButton title={title} url={shareUrl} compact />
        <a href={callablePhone ? `tel:${callablePhone}` : "#seller"} className={styles.mobileCallButton}>
          {callablePhone ? "تماس با فروشنده" : "اطلاعات فروشنده"}
        </a>
      </div>
    </main>
  );
}
