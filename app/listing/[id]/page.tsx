import Link from "next/link";
import { notFound } from "next/navigation";
import SaveListingButton from "../../components/SaveListingButton";
import ShareListingButton from "./ShareListingButton";
import StoryVipButton from "./StoryVipButton";
import styles from "./page.module.css";

const API_BASE = "https://api.chakod.com";

type ListingImage = {
  id: number;
  image_url: string;
  is_cover: boolean;
  sort_order: number;
};

type ListingData = {
  id: number;
  title?: string | null;
  description?: string | null;

  status?: string | null;
  listing_owner_type?: "personal" | "dealer" | string | null;

  seller_display_name?: string | null;
  seller_phone?: string | null;
  phone?: string | null;
  mobile?: string | null;
  contact_phone?: string | null;
  show_seller_name?: boolean;

  dealer_id?: number | string | null;
  dealer_name?: string | null;
  dealer_logo_url?: string | null;
  dealer_description?: string | null;
  dealer_is_verified?: boolean;

  category_name?: string | null;
  category_code?: string | null;

  plan_name?: string | null;
  plan_code?: string | null;
  is_highlighted?: boolean;
  show_on_home?: boolean;

  brand?: string | null;
  brand_name?: string | null;
  vehicle_brand?: string | null;

  model?: string | null;
  model_name?: string | null;
  vehicle_model?: string | null;

  production_year?: number | null;
  mileage_km?: number | null;
  price_toman?: number | null;
  price_is_negotiable?: boolean;

  gearbox?: string | null;
  transmission?: string | null;
  fuel_type?: string | null;
  body_condition?: string | null;
  technical_condition?: string | null;
  color?: string | null;
  body_color?: string | null;
  engine_condition?: string | null;
  chassis_condition?: string | null;
  insurance_months?: number | string | null;

  province?: string | null;
  province_name?: string | null;
  city?: string | null;
  city_name?: string | null;
  location_label?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;

  views_count?: number;
  favorite_count?: number;

  created_at?: string | null;
  updated_at?: string | null;

  ai_quality_score?: number | string | null;
  ai_confidence?: number | string | null;

  [key: string]: unknown;
};

type ListingApiResponse = {
  success: boolean;
  message?: string;
  data?: ListingData;
  images?: ListingImage[];
};

type PageProps = {
  params:
    | {
        id: string;
      }
    | Promise<{
        id: string;
      }>;
};

function normalizeUrl(url?: string | null) {
  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_BASE}${url}`;
  }

  return `${API_BASE}/${url}`;
}

function firstText(
  listing: ListingData,
  keys: Array<keyof ListingData>,
  fallback = ""
) {
  for (const key of keys) {
    const value = listing[key];

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
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

  if (number === null) {
    return "—";
  }

  return new Intl.NumberFormat("fa-IR").format(number);
}

function formatPrice(listing: ListingData) {
  const price = toFiniteNumber(listing.price_toman);

  if (price !== null && price > 0) {
    return `${new Intl.NumberFormat("fa-IR").format(price)} تومان`;
  }

  if (listing.price_is_negotiable) {
    return "توافقی";
  }

  return "قیمت درج نشده";
}

function formatDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function normalizePhone(value?: string | null) {
  if (!value) return "";

  return value.replace(/[^\d+]/g, "");
}

function SpecCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <article className={styles.specCard}>
      <span className={styles.specIcon} aria-hidden="true">
        {icon}
      </span>

      <div>
        <span className={styles.specTitle}>{title}</span>
        <strong className={styles.specValue}>{value}</strong>
      </div>
    </article>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={styles.detailRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

async function getListing(id: number): Promise<ListingApiResponse> {
  const response = await fetch(
    `${API_BASE}/api/listing-detail.php?id=${id}`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    }
  );

  let json: ListingApiResponse;

  try {
    json = (await response.json()) as ListingApiResponse;
  } catch {
    throw new Error("پاسخ دریافتی از سرور معتبر نیست.");
  }

if (response.status === 404) {
  throw new Error(
    json.message === "Listing is not available"
      ? "این آگهی هنوز تأیید و منتشر نشده است."
      : "آگهی موردنظر پیدا نشد."
  );
}

  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.message || "دریافت اطلاعات آگهی انجام نشد.");
  }

  return json;
}

export default async function ListingDetailPage({
  params,
}: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const listingId = Number(resolvedParams.id);

  if (!Number.isFinite(listingId) || listingId <= 0) {
    notFound();
  }

  let response: ListingApiResponse;

  try {
    response = await getListing(listingId);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "خطایی هنگام دریافت آگهی رخ داد.";

    return (
      <main className={styles.errorPage}>
        <section className={styles.errorCard}>
          <span className={styles.errorIcon}>!</span>
          <h1>نمایش آگهی ممکن نیست</h1>
          <p>{message}</p>

          <Link href="/ads" className={styles.primaryLink}>
            بازگشت به بازار خودرو
          </Link>
        </section>
      </main>
    );
  }

  const listing = response.data as ListingData;
  const images = Array.isArray(response.images)
    ? response.images
    : [];

  const title =
    firstText(listing, ["title"]) ||
    [
      firstText(listing, [
        "brand_name",
        "vehicle_brand",
        "brand",
      ]),
      firstText(listing, [
        "model_name",
        "vehicle_model",
        "model",
      ]),
      listing.production_year
        ? String(listing.production_year)
        : "",
    ]
      .filter(Boolean)
      .join(" ") ||
    "آگهی خودرو در چاکود";

  const brand = firstText(listing, [
    "brand_name",
    "vehicle_brand",
    "brand",
  ]);

  const model = firstText(listing, [
    "model_name",
    "vehicle_model",
    "model",
  ]);

  const gearbox = firstText(listing, [
    "gearbox",
    "transmission",
  ]);

  const color = firstText(listing, ["body_color", "color"]);

  const province = firstText(listing, [
    "province_name",
    "province",
  ]);

  const city = firstText(listing, ["city_name", "city"]);

  const locationLabel =
    firstText(listing, ["location_label"]) ||
    [province, city].filter(Boolean).join("، ");

  const isDealer =
    listing.listing_owner_type === "dealer" ||
    Boolean(listing.dealer_id);

  const sellerName = isDealer
    ? listing.dealer_name || "نمایشگاه عضو چاکود"
    : listing.seller_display_name || "فروشنده چاکود";

  const sellerPhone =
    listing.contact_phone ||
    listing.seller_phone ||
    listing.phone ||
    listing.mobile ||
    "";

  const callablePhone = normalizePhone(sellerPhone);

  const shareUrl = `${API_BASE}/listing/${listing.id}`;

  const latitude = toFiniteNumber(listing.latitude);
  const longitude = toFiniteNumber(listing.longitude);

  const mapUrl =
    latitude !== null && longitude !== null
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : "";

  const specs = [
    {
      title: "سال ساخت",
      value: listing.production_year
        ? formatNumber(listing.production_year)
        : "نامشخص",
      icon: "◷",
    },
    {
      title: "کارکرد",
      value:
        listing.mileage_km !== null &&
        listing.mileage_km !== undefined
          ? `${formatNumber(listing.mileage_km)} کیلومتر`
          : "نامشخص",
      icon: "⌁",
    },
    {
      title: "گیربکس",
      value: gearbox || "نامشخص",
      icon: "⚙",
    },
    {
      title: "سوخت",
      value: listing.fuel_type || "نامشخص",
      icon: "◇",
    },
  ];

  const technicalRows = [
    {
      label: "برند",
      value: brand,
    },
    {
      label: "مدل",
      value: model,
    },
    {
      label: "سال تولید",
      value: listing.production_year
        ? formatNumber(listing.production_year)
        : "",
    },
    {
      label: "کارکرد",
      value:
        listing.mileage_km !== null &&
        listing.mileage_km !== undefined
          ? `${formatNumber(listing.mileage_km)} کیلومتر`
          : "",
    },
    {
      label: "رنگ",
      value: color,
    },
    {
      label: "نوع گیربکس",
      value: gearbox,
    },
    {
      label: "نوع سوخت",
      value: listing.fuel_type || "",
    },
    {
      label: "وضعیت بدنه",
      value: listing.body_condition || "",
    },
    {
      label: "وضعیت فنی",
      value: listing.technical_condition || "",
    },
    {
      label: "وضعیت موتور",
      value: listing.engine_condition || "",
    },
    {
      label: "وضعیت شاسی",
      value: listing.chassis_condition || "",
    },
    {
      label: "بیمه",
      value: listing.insurance_months
        ? `${formatNumber(
            listing.insurance_months
          )} ماه`
        : "",
    },
  ].filter((item) => item.value);

  const createdDate = formatDate(listing.created_at);
  const updatedDate = formatDate(listing.updated_at);

  const aiScore =
    toFiniteNumber(listing.ai_quality_score) ??
    toFiniteNumber(listing.ai_confidence);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
          <Link href="/">خانه</Link>
          <span>/</span>
          <Link href="/ads">بازار خودرو</Link>
          <span>/</span>
          <strong>{title}</strong>
        </nav>

        <section className={styles.heroGrid}>
          <div className={styles.galleryCard}>
            {images.length > 0 ? (
              <>
                <div className={styles.galleryScroller}>
                  {images.map((image, index) => (
                    <figure
                      className={styles.gallerySlide}
                      id={`listing-image-${image.id}`}
                      key={image.id}
                    >
                      <img
                        src={normalizeUrl(image.image_url)}
                        alt={`${title} - تصویر ${index + 1}`}
                        loading={index === 0 ? "eager" : "lazy"}
                      />
                    </figure>
                  ))}
                </div>

                <div className={styles.imageCount}>
                  <span aria-hidden="true">▧</span>
                  {formatNumber(images.length)} تصویر
                </div>

                {images.length > 1 ? (
                  <div className={styles.thumbnailRow}>
                    {images.map((image, index) => (
                      <a
                        key={image.id}
                        href={`#listing-image-${image.id}`}
                        className={styles.thumbnail}
                        aria-label={`مشاهده تصویر ${index + 1}`}
                      >
                        <img
                          src={normalizeUrl(image.image_url)}
                          alt=""
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <div className={styles.imagePlaceholder}>
                <span aria-hidden="true">▧</span>
                <p>تصویری برای این آگهی ثبت نشده است.</p>
              </div>
            )}
          </div>

          <aside className={styles.summaryCard}>
            <div className={styles.badgeRow}>
              <span className={styles.approvedBadge}>
                <span aria-hidden="true">✓</span>
                تأیید انتشار چاکود
              </span>

              {listing.is_highlighted ? (
                <span className={styles.featuredBadge}>
                  آگهی ویژه
                </span>
              ) : null}

              <span className={styles.ownerBadge}>
                {isDealer ? "نمایشگاهی" : "شخصی"}
              </span>
            </div>

            <h1>{title}</h1>

            <div className={styles.priceBox}>
              <span>قیمت اعلام‌شده</span>
              <strong>{formatPrice(listing)}</strong>

              {listing.price_is_negotiable ? (
                <small>امکان مذاکره با فروشنده</small>
              ) : null}
            </div>

            <div className={styles.quickMeta}>
              <span>
                <b>{formatNumber(listing.views_count || 0)}</b>
                بازدید
              </span>

              <span>
                <b>{formatNumber(listing.favorite_count || 0)}</b>
                نشان‌شده
              </span>

              {city || province ? (
                <span>
                  <b>{city || province}</b>
                  موقعیت
                </span>
              ) : null}
            </div>

            <div className={styles.desktopActions}>
              {callablePhone ? (
                <a
                  href={`tel:${callablePhone}`}
                  className={styles.callButton}
                >
                  تماس با فروشنده
                </a>
              ) : (
                <a
                  href="#seller"
                  className={styles.callButton}
                >
                  مشاهده اطلاعات فروشنده
                </a>
              )}

              <div className={styles.secondaryActions}>
                <SaveListingButton
                  listingId={listing.id}
                  className={styles.saveButton}
                />

                <ShareListingButton
                  title={title}
                  url={shareUrl}
                />

                <StoryVipButton
                  listingId={listing.id}
                  title={title}
                />
              </div>
            </div>

            <p className={styles.summaryNotice}>
              تأیید انتشار چاکود به معنای تأیید سلامت فنی
              خودرو نیست. بازدید حضوری و کارشناسی مستقل
              پیشنهاد می‌شود.
            </p>
          </aside>
        </section>

        <section className={styles.specGrid}>
          {specs.map((spec) => (
            <SpecCard
              key={spec.title}
              title={spec.title}
              value={spec.value}
              icon={spec.icon}
            />
          ))}
        </section>

        <section className={styles.chakodTrustCard}>
          <div className={styles.trustLogo}>چ</div>

          <div className={styles.trustContent}>
            <span className={styles.eyebrow}>
              ویترین حرفه‌ای چاکود
            </span>

            <h2>این آگهی با هویت چاکود منتشر شده است</h2>

            <p>
              اطلاعات، تصاویر و هویت آگهی‌دهنده در قالب یک
              صفحه حرفه‌ای و قابل اشتراک‌گذاری ارائه شده‌اند.
            </p>
          </div>

          <div className={styles.trustItems}>
            <span>✓ بررسی ساختار آگهی</span>
            <span>✓ نمایش شفاف فروشنده</span>
            <span>✓ لینک رسمی قابل اشتراک</span>
          </div>
        </section>

        <div className={styles.contentGrid}>
          <div className={styles.mainColumn}>
            {technicalRows.length > 0 ? (
              <section className={styles.contentCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <span className={styles.eyebrow}>
                      مشخصات خودرو
                    </span>
                    <h2>اطلاعات فنی و ظاهری</h2>
                  </div>

                  {listing.category_name ? (
                    <span className={styles.categoryBadge}>
                      {listing.category_name}
                    </span>
                  ) : null}
                </div>

                <div className={styles.detailGrid}>
                  {technicalRows.map((item) => (
                    <DetailRow
                      key={item.label}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className={styles.contentCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.eyebrow}>
                    توضیحات فروشنده
                  </span>
                  <h2>معرفی این خودرو</h2>
                </div>
              </div>

              <div className={styles.description}>
                {listing.description ? (
                  listing.description
                    .split(/\r?\n/)
                    .filter(Boolean)
                    .map((line, index) => (
                      <p key={`${line}-${index}`}>{line}</p>
                    ))
                ) : (
                  <p>
                    توضیح تکمیلی برای این آگهی ثبت نشده است.
                    برای دریافت اطلاعات بیشتر با فروشنده تماس
                    بگیرید.
                  </p>
                )}
              </div>
            </section>

            <section className={styles.contentCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.eyebrow}>
                    موقعیت خودرو
                  </span>
                  <h2>{locationLabel || "موقعیت ثبت نشده"}</h2>
                </div>
              </div>

              <div className={styles.locationPanel}>
                <div className={styles.locationPin}>⌖</div>

                <div className={styles.locationText}>
                  <strong>
                    {locationLabel ||
                      "فروشنده هنوز محدوده خودرو را مشخص نکرده است."}
                  </strong>

                  <p>
                    برای حفظ حریم خصوصی، محل دقیق خودرو را
                    پیش از مراجعه با فروشنده هماهنگ کنید.
                  </p>
                </div>

                {mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.mapButton}
                  >
                    مشاهده مسیر
                  </a>
                ) : null}
              </div>
            </section>

            <section className={styles.contentCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.eyebrow}>
                    بررسی هوشمند
                  </span>
                  <h2>کیفیت اطلاعات آگهی</h2>
                </div>

                {aiScore !== null ? (
                  <span className={styles.scoreBadge}>
                    {formatNumber(Math.round(aiScore))}
                    از ۱۰۰
                  </span>
                ) : null}
              </div>

              <div className={styles.reviewGrid}>
                <div>
                  <span>وضعیت انتشار</span>
                  <strong>تأیید شده</strong>
                </div>

                <div>
                  <span>نوع آگهی‌دهنده</span>
                  <strong>
                    {isDealer ? "نمایشگاه" : "فروشنده شخصی"}
                  </strong>
                </div>

                <div>
                  <span>تصاویر</span>
                  <strong>
                    {formatNumber(images.length)} تصویر
                  </strong>
                </div>

                <div>
                  <span>سطح نمایش</span>
                  <strong>
                    {listing.plan_name || "عادی"}
                  </strong>
                </div>
              </div>

              <p className={styles.reviewDisclaimer}>
                بررسی هوشمند چاکود برای کنترل کیفیت اطلاعات و
                کاهش محتوای نامعتبر انجام می‌شود؛ اما جایگزین
                کارشناسی فنی، حقوقی یا اصالت خودرو نیست.
              </p>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section
              className={styles.sellerCard}
              id="seller"
            >
              <div className={styles.sellerCardTop}>
                {isDealer &&
                listing.dealer_logo_url ? (
                  <img
                    className={styles.sellerLogo}
                    src={normalizeUrl(
                      listing.dealer_logo_url
                    )}
                    alt={sellerName}
                  />
                ) : (
                  <div className={styles.sellerAvatar}>
                    {sellerName.trim().charAt(0) || "چ"}
                  </div>
                )}

                <div>
                  <span className={styles.eyebrow}>
                    {isDealer
                      ? "نمایشگاه عرضه‌کننده"
                      : "فروشنده آگهی"}
                  </span>

                  <h2>{sellerName}</h2>

                  <div className={styles.verificationRow}>
                    {isDealer &&
                    listing.dealer_is_verified ? (
                      <span className={styles.verifiedBadge}>
                        ✓ نمایشگاه تأییدشده
                      </span>
                    ) : (
                      <span className={styles.memberBadge}>
                        عضو چاکود
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isDealer &&
              listing.dealer_description ? (
                <p className={styles.sellerDescription}>
                  {listing.dealer_description}
                </p>
              ) : (
                <p className={styles.sellerDescription}>
                  این آگهی‌دهنده، خودروی خود را از طریق ویترین
                  حرفه‌ای چاکود معرفی کرده است.
                </p>
              )}

              <div className={styles.sellerIdentity}>
                <span>هویت انتشار</span>
                <strong>
                  {isDealer
                    ? "به نام نمایشگاه"
                    : "آگهی شخصی"}
                </strong>
              </div>

              {callablePhone ? (
                <a
                  href={`tel:${callablePhone}`}
                  className={styles.sellerCallButton}
                >
                  تماس با {isDealer ? "نمایشگاه" : "فروشنده"}
                </a>
              ) : (
                <div className={styles.noPhone}>
                  شماره تماس در پاسخ API موجود نیست.
                </div>
              )}

              <p className={styles.prideText}>
                این فروشنده با افتخار در چاکود حضور دارد.
              </p>
            </section>

            <section className={styles.sideInfoCard}>
              <h3>اطلاعات انتشار</h3>

              <DetailRow
                label="شماره آگهی"
                value={formatNumber(listing.id)}
              />

              {createdDate ? (
                <DetailRow
                  label="تاریخ انتشار"
                  value={createdDate}
                />
              ) : null}

              {updatedDate &&
              updatedDate !== createdDate ? (
                <DetailRow
                  label="آخرین به‌روزرسانی"
                  value={updatedDate}
                />
              ) : null}

              <DetailRow
                label="تعداد بازدید"
                value={formatNumber(
                  listing.views_count || 0
                )}
              />

              <DetailRow
                label="نوع آگهی"
                value={isDealer ? "نمایشگاهی" : "شخصی"}
              />

              {listing.category_name ? (
                <DetailRow
                  label="دسته‌بندی"
                  value={listing.category_name}
                />
              ) : null}
            </section>

            <section className={styles.safetyCard}>
              <span className={styles.safetyIcon}>!</span>

              <div>
                <h3>خرید امن‌تر</h3>
                <p>
                  پیش از پرداخت، خودرو و مدارک را حضوری بررسی
                  کنید و بدون قرارداد معتبر وجهی انتقال ندهید.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <div className={styles.mobileActionBar}>
        <SaveListingButton
          listingId={listing.id}
          compact
          className={styles.mobileSaveButton}
        />

        <ShareListingButton
          title={title}
          url={shareUrl}
          compact
        />

        <StoryVipButton
          listingId={listing.id}
          title={title}
          compact
        />

        {callablePhone ? (
          <a
            href={`tel:${callablePhone}`}
            className={styles.mobileCallButton}
          >
            تماس با فروشنده
          </a>
        ) : (
          <a
            href="#seller"
            className={styles.mobileCallButton}
          >
            اطلاعات فروشنده
          </a>
        )}
      </div>
    </main>
  );
}