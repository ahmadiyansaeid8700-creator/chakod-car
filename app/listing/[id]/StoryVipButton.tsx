"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = "https://api.chakod.com";
const STORY_UPDATED_EVENT = "chakod:story-vip-updated";

type StoryVipButtonProps = {
  listingId: number;
  title: string;
  compact?: boolean;
};

type StoryLocation = {
  province: string;
  city: string;
};

type ActiveStory = {
  id: number;
  status: string;
  starts_at: string;
  expires_at: string;
  duration_hours: number;
  view_count: number;
  click_count: number;
  locations?: StoryLocation[];
};

type PendingOrder = {
  id: number;
  amount_toman: number;
  duration_hours: number;
  moderation_status: string;
  ai_decision?: string | null;
  ai_reason?: string | null;
  locations?: StoryLocation[];
};

type StoryStatusResponse = {
  success: boolean;
  message?: string;
  config?: {
    price_toman: number;
    price_per_city_toman?: number;
    duration_hours: number;
    max_cities?: number;
    price_formula?: string;
  };
  access?: {
    can_view: boolean;
    can_create_story: boolean;
    can_cancel_story: boolean;
    reason?: string;
  };
  listing?: {
    id: number;
    title: string;
    brand: string;
    model: string;
    province: string;
    city: string;
    cover_image?: {
      image_id: number;
      image_url: string;
    } | null;
  };
  story?: {
    active: boolean;
    item: ActiveStory | null;
    pending?: boolean;
    pending_order?: PendingOrder | null;
  };
  can_start_story?: boolean;
  cannot_reason?: string;
};

type CreateOrderResponse = {
  success: boolean;
  message?: string;
  payment_status?: string;
  payment_method?: "wallet" | "gateway";
  gateway_ready?: boolean;
  payment?: {
    payment_url?: string | null;
  };
  story?: {
    id?: number | null;
    active?: boolean;
    status?: string;
    locations?: StoryLocation[];
  };
  order?: {
    amount_toman?: number;
    city_count?: number;
    locations?: StoryLocation[];
  };
};

type GeoResponse = {
  success: boolean;
  data?: string[];
  message?: string;
};

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
    "X-Session-Token": token,
  };
}

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
}

function normalizeImageUrl(value?: string) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return `${API_BASE}${value.startsWith("/") ? value : `/${value}`}`;
}

function locationKey(location: StoryLocation) {
  return `${location.province}|${location.city}`;
}

function formatRemaining(milliseconds: number) {
  if (milliseconds <= 0) return "به پایان رسیده";

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${new Intl.NumberFormat("fa-IR").format(hours)} ساعت و ${new Intl.NumberFormat(
    "fa-IR",
  ).format(minutes)} دقیقه و ${new Intl.NumberFormat("fa-IR").format(seconds)} ثانیه`;
}

function locationSummary(locations: StoryLocation[]) {
  if (locations.length === 0) return "بدون شهر";
  if (locations.length <= 3) return locations.map((item) => item.city).join("، ");
  return `${locations.slice(0, 3).map((item) => item.city).join("، ")} +${new Intl.NumberFormat(
    "fa-IR",
  ).format(locations.length - 3)}`;
}

async function fetchGeo(province?: string) {
  const params = new URLSearchParams();
  if (province) params.set("province", province);

  const response = await fetch(
    `${API_BASE}/api/geo-locations.php${params.toString() ? `?${params}` : ""}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );

  const json = (await response.json()) as GeoResponse;

  if (!response.ok || !json.success) {
    throw new Error(json.message || "دریافت موقعیت‌ها انجام نشد.");
  }

  return Array.isArray(json.data) ? json.data : [];
}

export default function StoryVipButton({ listingId, title, compact = false }: StoryVipButtonProps) {
  const [status, setStatus] = useState<StoryStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<"wallet" | "gateway" | "remove" | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [accessMessage, setAccessMessage] = useState("");
  const [now, setNow] = useState(Date.now());

  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<StoryLocation[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/my-listing-story.php?listing_id=${encodeURIComponent(listingId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json", ...authHeaders() },
          cache: "no-store",
        },
      );

      const json = (await response.json().catch(() => ({
        success: false,
        message: "پاسخ وضعیت استوری معتبر نیست.",
      }))) as StoryStatusResponse;

      if (response.status === 401 || response.status === 403) {
        setStatus(null);
        setAccessMessage(
          json.message ||
            (response.status === 401
              ? "برای مدیریت استوری وارد حساب کاربری شوید."
              : "این دکمه فقط برای مالک آگهی یا اعضای مجاز نمایشگاه فعال است."),
        );
        return;
      }

      if (!response.ok || !json.success) {
        throw new Error(json.message || "دریافت وضعیت استوری انجام نشد.");
      }

      setAccessMessage("");
      setStatus(json);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "دریافت وضعیت استوری انجام نشد.");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    void loadStatus();
    const handleUpdate = () => void loadStatus();
    window.addEventListener(STORY_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(STORY_UPDATED_EVENT, handleUpdate);
  }, [loadStatus]);

  useEffect(() => {
    if (!status?.story?.active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [status?.story?.active]);

  useEffect(() => {
    if (!open || provinces.length > 0) return;

    let ignore = false;
    setLoadingGeo(true);

    fetchGeo()
      .then((items) => {
        if (!ignore) setProvinces(items);
      })
      .catch((geoError) => {
        if (!ignore) setError(geoError instanceof Error ? geoError.message : "دریافت استان‌ها انجام نشد.");
      })
      .finally(() => {
        if (!ignore) setLoadingGeo(false);
      });

    return () => {
      ignore = true;
    };
  }, [open, provinces.length]);

  useEffect(() => {
    if (!open || selectedLocations.length > 0 || !status?.listing?.city) return;

    setSelectedLocations([
      {
        province: status.listing.province || "",
        city: status.listing.city,
      },
    ]);
    setSelectedProvince(status.listing.province || "");
  }, [open, selectedLocations.length, status?.listing?.city, status?.listing?.province]);

  useEffect(() => {
    if (!selectedProvince) {
      setCities([]);
      return;
    }

    let ignore = false;
    setLoadingGeo(true);

    fetchGeo(selectedProvince)
      .then((items) => {
        if (!ignore) setCities(items);
      })
      .catch((geoError) => {
        if (!ignore) setError(geoError instanceof Error ? geoError.message : "دریافت شهرها انجام نشد.");
      })
      .finally(() => {
        if (!ignore) setLoadingGeo(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedProvince]);

  const activeStory = status?.story?.item || null;
  const pendingOrder = status?.story?.pending_order || null;
  const unitPrice = status?.config?.price_per_city_toman || status?.config?.price_toman || 50000;
  const maxCities = status?.config?.max_cities || 31;
  const totalPrice = unitPrice * selectedLocations.length;
  const coverUrl = normalizeImageUrl(status?.listing?.cover_image?.image_url);

  const remaining = useMemo(() => {
    if (!activeStory?.expires_at) return "";
    const expiresAt = new Date(activeStory.expires_at).getTime();
    if (Number.isNaN(expiresAt)) return "";
    return formatRemaining(expiresAt - now);
  }, [activeStory?.expires_at, now]);

  const hasLocalToken = getToken() !== "";
  if (!loading && !status?.access?.can_view && !hasLocalToken) return null;

  function toggleCity(city: string) {
    const location = { province: selectedProvince, city };
    const key = locationKey(location);

    setSelectedLocations((current) => {
      if (current.some((item) => locationKey(item) === key)) {
        return current.filter((item) => locationKey(item) !== key);
      }

      if (current.length >= maxCities) {
        setError(`حداکثر ${new Intl.NumberFormat("fa-IR").format(maxCities)} شهر قابل انتخاب است.`);
        return current;
      }

      setError("");
      return [...current, location];
    });
  }

  function removeLocation(location: StoryLocation) {
    const key = locationKey(location);
    setSelectedLocations((current) => current.filter((item) => locationKey(item) !== key));
  }

  async function createStory(paymentMethod: "wallet" | "gateway") {
    if (selectedLocations.length < 1) {
      setError("حداقل یک شهر انتخاب کنید.");
      return;
    }

    setWorking(paymentMethod);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE}/api/create-story-order.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          listing_id: listingId,
          payment_method: paymentMethod,
          locations: selectedLocations,
        }),
      });

      const json = (await response.json()) as CreateOrderResponse;
      if (!response.ok || !json.success) throw new Error(json.message || "ساخت سفارش استوری انجام نشد.");

      const paymentUrl = json.payment?.payment_url;
      if (
        paymentMethod === "gateway" &&
        json.gateway_ready &&
        typeof paymentUrl === "string" &&
        paymentUrl.length > 0
      ) {
        window.location.assign(paymentUrl);
        return;
      }

      setMessage(json.message || (json.story?.active ? "استوری VIP فعال شد." : "استوری برای بررسی ارسال شد."));
      await loadStatus();
      window.dispatchEvent(new Event(STORY_UPDATED_EVENT));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "عملیات استوری انجام نشد.");
    } finally {
      setWorking(null);
    }
  }

  async function removeStory() {
    setWorking("remove");
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE}/api/my-listing-story.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ listing_id: listingId, action: "cancel_story" }),
      });

      const json = (await response.json()) as { success: boolean; message?: string };
      if (!response.ok || !json.success) throw new Error(json.message || "حذف استوری انجام نشد.");

      setMessage("استوری حذف شد. مبلغ پرداختی بازگردانده نمی‌شود.");
      setSelectedLocations([]);
      await loadStatus();
      window.dispatchEvent(new Event(STORY_UPDATED_EVENT));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "حذف استوری انجام نشد.");
    } finally {
      setWorking(null);
    }
  }

  const buttonLabel = loading
    ? "استوری VIP"
    : activeStory
      ? "استوری فعال"
      : pendingOrder
        ? "در انتظار تأیید"
        : "استوری VIP";

  const duration = status?.config?.duration_hours || 24;

  return (
    <div className="chakodStoryVipRoot" dir="rtl">
      <button
        type="button"
        className={`chakodStoryVipTrigger ${compact ? "compact" : ""} ${activeStory ? "active" : ""}`}
        onClick={() => setOpen(true)}
        disabled={loading}
        title={buttonLabel}
        aria-label={buttonLabel}
      >
        <span aria-hidden="true">✦</span>
        {!compact ? <strong>{buttonLabel}</strong> : null}
      </button>

      {open ? (
        <div className="chakodStoryVipBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section className="chakodStoryVipModal" role="dialog" aria-modal="true">
            <header className="chakodStoryVipHead">
              <div>
                <span>CHAKOD STORY VIP</span>
                <h2>استوری ۲۴ ساعته با انتخاب شهر</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="بستن">×</button>
            </header>

            <div className="chakodStoryVipListing">
              <div className="chakodStoryVipCover">{coverUrl ? <img src={coverUrl} alt={title} /> : <span>چ</span>}</div>
              <div>
                <strong>{status?.listing?.title || title}</strong>
                <small>شهر آگهی: {[status?.listing?.city, status?.listing?.province].filter(Boolean).join("، ")}</small>
              </div>
            </div>

            {!status?.access?.can_view ? (
              <div className="panel pending">
                <strong>دسترسی استوری در حال بررسی است</strong>
                <p>{accessMessage || error}</p>
              </div>
            ) : activeStory ? (
              <div className="panel activePanel">
                <span>استوری اکنون فعال است</span>
                <strong>{remaining || "در حال محاسبه"}</strong>
                <p>محدوده: {locationSummary(activeStory.locations || [])}</p>
                <div className="stats">
                  <span>{new Intl.NumberFormat("fa-IR").format(activeStory.view_count || 0)} بازدید</span>
                  <span>{new Intl.NumberFormat("fa-IR").format(activeStory.click_count || 0)} کلیک</span>
                </div>
                <button type="button" className="danger" disabled={working === "remove"} onClick={removeStory}>
                  {working === "remove" ? "در حال حذف..." : "حذف استوری"}
                </button>
                <small>حذف زودتر از موعد باعث برگشت مبلغ نمی‌شود.</small>
              </div>
            ) : pendingOrder ? (
              <div className="panel pending">
                <strong>در انتظار تأیید چاکود</strong>
                <p>{pendingOrder.ai_reason || "پرداخت انجام شده و بررسی در حال انجام است."}</p>
                <small>محدوده: {locationSummary(pendingOrder.locations || [])}</small>
              </div>
            ) : status?.can_start_story ? (
              <>
                <div className="benefits">
                  <article><span>۲۴</span><strong>ساعت نمایش</strong></article>
                  <article><span>∞</span><strong>بدون رزرو</strong></article>
                  <article><span>AI</span><strong>تأیید هوشمند</strong></article>
                </div>

                <section className="locationBox">
                  <div className="locationTitle">
                    <div><strong>شهرهای نمایش استوری</strong><small>هر شهر ۵۰٬۰۰۰ تومان برای ۲۴ ساعت</small></div>
                    <b>{new Intl.NumberFormat("fa-IR").format(selectedLocations.length)} شهر</b>
                  </div>

                  <label>
                    <span>استان</span>
                    <select value={selectedProvince} onChange={(event) => setSelectedProvince(event.target.value)} disabled={loadingGeo}>
                      <option value="">انتخاب استان</option>
                      {provinces.map((province) => <option key={province} value={province}>{province}</option>)}
                    </select>
                  </label>

                  {selectedProvince ? (
                    <div className="cityGrid">
                      {cities.map((city) => {
                        const checked = selectedLocations.some(
                          (item) => item.province === selectedProvince && item.city === city,
                        );
                        return (
                          <button key={city} type="button" className={checked ? "selected" : ""} onClick={() => toggleCity(city)}>
                            <span>{checked ? "✓" : "+"}</span>{city}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="chips">
                    {selectedLocations.map((location) => (
                      <button key={locationKey(location)} type="button" onClick={() => removeLocation(location)}>
                        {location.city}<span>×</span>
                      </button>
                    ))}
                  </div>
                </section>

                <div className="invoice">
                  <div><span>نرخ هر شهر</span><strong>{formatPrice(unitPrice)}</strong></div>
                  <div><span>تعداد شهر</span><strong>{new Intl.NumberFormat("fa-IR").format(selectedLocations.length)}</strong></div>
                  <div><span>مدت نمایش</span><strong>{duration} ساعت</strong></div>
                  <div className="total"><span>مبلغ نهایی</span><strong>{formatPrice(totalPrice)}</strong></div>
                </div>

                <div className="paymentActions">
                  <button type="button" className="wallet" disabled={working !== null || selectedLocations.length === 0} onClick={() => createStory("wallet")}>
                    {working === "wallet" ? "در حال پرداخت..." : "پرداخت از کیف پول"}
                  </button>
                  <button type="button" className="gateway" disabled={working !== null || selectedLocations.length === 0} onClick={() => createStory("gateway")}>
                    {working === "gateway" ? "در حال اتصال..." : "پرداخت اینترنتی"}
                  </button>
                </div>
              </>
            ) : (
              <div className="panel pending"><strong>امکان فعال‌سازی استوری وجود ندارد</strong><p>{status?.cannot_reason}</p></div>
            )}

            {message ? <div className="successMessage">{message}</div> : null}
            {error && status?.access?.can_view ? <div className="errorMessage">{error}</div> : null}
          </section>
        </div>
      ) : null}

      <style>{`
        .chakodStoryVipRoot{position:relative;display:inline-flex;font-family:Tahoma,Arial,sans-serif}.chakodStoryVipTrigger{min-height:44px;padding:0 14px;border:1px solid #d9c9f0;border-radius:13px;display:inline-flex;align-items:center;justify-content:center;gap:7px;color:#5b21b6;background:linear-gradient(180deg,#fff,#f7f1ff);box-shadow:0 10px 24px rgba(91,33,182,.1);cursor:pointer}.chakodStoryVipTrigger.compact{width:44px;min-width:44px;height:44px;padding:0}.chakodStoryVipTrigger.active{color:#087f5b;border-color:#a7e4ce;background:#effcf6}.chakodStoryVipTrigger:disabled{opacity:.7}.chakodStoryVipTrigger strong{font-size:10px;white-space:nowrap}.chakodStoryVipTrigger>span{font-size:17px}.chakodStoryVipBackdrop{position:fixed;inset:0;z-index:900;padding:18px;display:grid;place-items:center;background:rgba(20,10,34,.58);backdrop-filter:blur(8px)}.chakodStoryVipModal{width:min(760px,100%);max-height:calc(100vh - 36px);overflow:auto;border:1px solid #eadff8;border-radius:26px;padding:22px;color:#24172e;background:#fff;box-shadow:0 34px 100px rgba(20,10,34,.3)}.chakodStoryVipHead{display:flex;justify-content:space-between;gap:14px}.chakodStoryVipHead span{color:#6d28d9;font-size:9px;font-weight:900}.chakodStoryVipHead h2{margin:5px 0 0;font-size:21px}.chakodStoryVipHead>button{width:36px;height:36px;border:0;border-radius:12px;background:#f4effa;font-size:22px;cursor:pointer}.chakodStoryVipListing{margin-top:16px;padding:12px;border:1px solid #eee4f8;border-radius:17px;display:flex;align-items:center;gap:12px;background:#fbf9ff}.chakodStoryVipCover{width:66px;height:52px;overflow:hidden;border-radius:12px;display:grid;place-items:center;color:#6d28d9;background:#eee5fb;font-size:22px}.chakodStoryVipCover img{width:100%;height:100%;object-fit:cover}.chakodStoryVipListing strong,.chakodStoryVipListing small{display:block}.chakodStoryVipListing strong{font-size:11px}.chakodStoryVipListing small{margin-top:5px;color:#83758d;font-size:8px}.benefits{margin-top:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.benefits article{padding:12px;border:1px solid #eee4f7;border-radius:15px;text-align:center;background:#fcfaff}.benefits span,.benefits strong{display:block}.benefits span{color:#6d28d9;font-size:18px;font-weight:900}.benefits strong{margin-top:4px;font-size:8px}.locationBox{margin-top:14px;padding:14px;border:1px solid #e5d7f4;border-radius:18px;background:#fbf9ff}.locationTitle{display:flex;justify-content:space-between;gap:12px}.locationTitle strong,.locationTitle small{display:block}.locationTitle strong{font-size:11px}.locationTitle small{margin-top:4px;color:#84778f;font-size:8px}.locationTitle b{color:#6d28d9;font-size:10px}.locationBox label{margin-top:12px;display:grid;gap:6px}.locationBox label>span{font-size:9px;font-weight:900}.locationBox select{min-height:42px;border:1px solid #ded1ec;border-radius:12px;padding:0 10px;background:#fff;font-size:9px}.cityGrid{max-height:190px;margin-top:10px;overflow:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.cityGrid button{min-height:37px;padding:7px 9px;border:1px solid #e8dff2;border-radius:11px;display:flex;align-items:center;gap:6px;color:#5f5367;background:#fff;font-size:8px;cursor:pointer}.cityGrid button span{width:18px;height:18px;border-radius:6px;display:grid;place-items:center;color:#6d28d9;background:#f2ebfc}.cityGrid button.selected{color:#4c1d95;border-color:#a78bfa;background:#f4efff}.chips{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px}.chips button{padding:6px 9px;border:1px solid #d9c8ef;border-radius:999px;color:#5b21b6;background:#fff;font-size:8px;cursor:pointer}.chips button span{margin-right:6px}.invoice{margin-top:14px;display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.invoice>div{padding:11px;border:1px solid #eee5f7;border-radius:13px;display:flex;justify-content:space-between;gap:8px}.invoice span{color:#7f7388;font-size:8px}.invoice strong{font-size:9px}.invoice .total{grid-column:1/-1;color:#fff;border:0;background:linear-gradient(135deg,#4c1d95,#7c3aed)}.invoice .total span{color:#e9ddff}.invoice .total strong{font-size:12px}.paymentActions{margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:8px}.paymentActions button,.danger{min-height:44px;border-radius:13px;font-size:9px;font-weight:900;cursor:pointer}.paymentActions button:disabled,.danger:disabled{opacity:.55}.wallet{border:0;color:#fff;background:linear-gradient(135deg,#4c1d95,#7c3aed)}.gateway{border:1px solid #d8c8ed;color:#5b21b6;background:#fff}.panel{margin-top:14px;padding:16px;border-radius:17px}.panel strong,.panel span,.panel small{display:block}.panel p{margin:8px 0;line-height:1.8;font-size:9px}.activePanel{color:#145f48;border:1px solid #bde8d5;background:#effbf6}.activePanel>strong{margin-top:5px;font-size:14px}.pending{color:#6a4c12;border:1px solid #f1dda9;background:#fff9e8}.stats{margin:10px 0;display:flex;gap:8px}.stats span{padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.7);font-size:8px}.danger{width:100%;border:1px solid #f3b8b8;color:#b42318;background:#fff}.successMessage,.errorMessage{margin-top:12px;padding:10px;border-radius:12px;font-size:9px}.successMessage{color:#087f5b;background:#ecfdf3}.errorMessage{color:#b42318;background:#fff1f0}@media(max-width:640px){.chakodStoryVipBackdrop{align-items:end;padding:0}.chakodStoryVipModal{width:100%;max-height:91vh;border-radius:24px 24px 0 0;padding:17px 13px 22px}.chakodStoryVipHead h2{font-size:17px}.benefits{grid-template-columns:repeat(3,1fr)}.cityGrid{grid-template-columns:1fr 1fr}.paymentActions{position:sticky;bottom:-22px;margin:14px -13px -22px;padding:12px 13px 20px;background:rgba(255,255,255,.96);border-top:1px solid #eee4f6}}
      `}</style>
    </div>
  );
}