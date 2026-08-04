"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = "https://api.chakod.com";

type User = {
  id?: number;
  mobile?: string;
  full_name?: string | null;
  account_type?: "personal" | "dealer" | "business";
  business_name?: string | null;
  display_name?: string;
};

type Dealer = {
  id: number;
  dealer_id?: number;
  auth_user_id?: number;
  dealer_name?: string;
  dealer_phone?: string;
  province?: string;
  city?: string;
  neighborhood?: string;
  address?: string;
  role?: string;
  role_title?: string;
  scope?: string;
  permissions?: string[];
  branch_ids?: number[];
  is_active?: number | boolean;
  created_at?: string;
  updated_at?: string;
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

async function fetchGeo(params?: { province?: string; city?: string }) {
  const search = new URLSearchParams();

  if (params?.province) search.set("province", params.province);
  if (params?.city) search.set("city", params.city);

  const url = search.toString()
    ? `${API_BASE}/api/geo-locations.php?${search.toString()}`
    : `${API_BASE}/api/geo-locations.php`;

  const res = await fetch(url);
  const json = await res.json();

  return {
    success: Boolean(json.success),
    type: json.type || "",
    hasNeighborhoods: Boolean(json.has_neighborhoods),
    data: Array.isArray(json.data) ? (json.data as string[]) : [],
  };
}

export default function DealersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [dealers, setDealers] = useState<Dealer[]>([]);

  const [dealerName, setDealerName] = useState("");
  const [dealerPhone, setDealerPhone] = useState("");

  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [cityHasNeighborhoods, setCityHasNeighborhoods] = useState(false);

  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadDealers() {
    const token = getToken();

    const res = await fetch(`${API_BASE}/api/my-dealers.php`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
              "X-Session-Token": token,
            }
          : {}),
      },
      credentials: "include",
      cache: "no-store",
    });

    const json = await res.json();

    if (json.success && Array.isArray(json.data)) {
      setDealers(
        json.data
          .map((item: Dealer) => ({
            ...item,
            id: Number(item.id ?? item.dealer_id ?? 0),
          }))
          .filter((item: Dealer) => item.id > 0)
      );
    } else {
      setDealers([]);
    }
  }

  useEffect(() => {
    async function boot() {
      setLoading(true);
      setError("");

      try {
        const token = getToken();

        const meRes = await fetch(`${API_BASE}/api/me.php`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                  "X-Session-Token": token,
                }
              : {}),
          },
          credentials: "include",
          cache: "no-store",
        });

        const meJson = await meRes.json();

        if (meJson.success && meJson.logged_in && meJson.user) {
          setLoggedIn(true);
          setUser(meJson.user);
          localStorage.setItem("chakod_user", JSON.stringify(meJson.user));
          await loadDealers();
        } else {
          setLoggedIn(false);
          setUser(null);
        }
      } catch {
        setLoggedIn(false);
        setUser(null);
      }

      try {
        const geo = await fetchGeo();
        setProvinces(geo.data);
      } catch {
        setProvinces([]);
      }

      setLoading(false);
    }

    boot();
  }, []);

  useEffect(() => {
    async function loadCities() {
      if (!province) {
        setCities([]);
        setCity("");
        setNeighborhoods([]);
        setNeighborhood("");
        setCityHasNeighborhoods(false);
        return;
      }

      setGeoLoading(true);
      setCities([]);
      setCity("");
      setNeighborhoods([]);
      setNeighborhood("");
      setCityHasNeighborhoods(false);

      try {
        const result = await fetchGeo({ province });
        setCities(result.data);
      } catch {
        setCities([]);
      } finally {
        setGeoLoading(false);
      }
    }

    loadCities();
  }, [province]);

  useEffect(() => {
    async function loadNeighborhoods() {
      if (!province || !city) {
        setNeighborhoods([]);
        setNeighborhood("");
        setCityHasNeighborhoods(false);
        return;
      }

      setGeoLoading(true);
      setNeighborhoods([]);
      setNeighborhood("");
      setCityHasNeighborhoods(false);

      try {
        const result = await fetchGeo({ province, city });
        setNeighborhoods(result.data);
        setCityHasNeighborhoods(result.hasNeighborhoods && result.data.length > 0);
      } catch {
        setNeighborhoods([]);
        setCityHasNeighborhoods(false);
      } finally {
        setGeoLoading(false);
      }
    }

    loadNeighborhoods();
  }, [province, city]);

  async function createDealer() {
    setSaving(true);
    setMessage("");
    setError("");

    const cleanName = dealerName.trim();
    const cleanPhone = normalizeDigits(dealerPhone).trim();

    if (cleanName.length < 2) {
      setError("نام نمایشگاه را کامل وارد کنید.");
      setSaving(false);
      return;
    }

    try {
      const token = getToken();

      const res = await fetch(`${API_BASE}/api/my-dealers.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
                "X-Session-Token": token,
              }
            : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          dealer_name: cleanName,
          dealer_phone: cleanPhone,
          province,
          city,
          neighborhood: cityHasNeighborhoods ? neighborhood : "",
          address,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.message || "ثبت نمایشگاه انجام نشد.");
        return;
      }

      setMessage("نمایشگاه با موفقیت ثبت شد.");

      setDealerName("");
      setDealerPhone("");
      setProvince("");
      setCity("");
      setNeighborhood("");
      setAddress("");
      setCityHasNeighborhoods(false);

      await loadDealers();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="dealersPage" dir="rtl">
      <section className="shell">
        <div className="topbar">
          <Link href="/" className="brand">
            <div className="logoMark">چ</div>
            <div>
              <strong>چاکود</strong>
              <span>پلتفرم رشد کسب‌وکار</span>
            </div>
          </Link>

          <div className="navLinks">
            <a href="/account/listings/new">ثبت آگهی</a>
            <a href="/account">حساب کاربری</a>
          </div>
        </div>

        {loading && (
          <div className="card centerCard">
            <div className="loader" />
            <h1>در حال آماده‌سازی...</h1>
            <p>چند لحظه صبر کنید.</p>
          </div>
        )}

        {!loading && !loggedIn && (
          <div className="card centerCard">
            <span className="miniLabel">نمایشگاه من</span>
            <h1>برای مدیریت نمایشگاه وارد شوید</h1>
            <p>برای افزودن نمایشگاه و ثبت آگهی به نام نمایشگاه، ابتدا وارد حساب کاربری شوید.</p>
            <a className="primaryLink" href="/login">
              ورود با شماره موبایل
            </a>
          </div>
        )}

        {!loading && loggedIn && (
          <>
            <div className="heroCard">
              <span className="miniLabel">نمایشگاه‌های من</span>
              <h1>مدیریت نمایشگاه در چاکود</h1>
              <p>
                سلام، {user?.display_name || user?.full_name || "همراه چاکود"} 👑
                اینجا می‌توانید نمایشگاه خود را ثبت کنید تا بعداً آگهی‌ها با نام نمایشگاه شما نمایش داده شوند.
              </p>
            </div>

            <div className="grid">
              <div className="card">
                <div className="sectionHead">
                  <span>افزودن نمایشگاه</span>
                  <h2>اطلاعات نمایشگاه</h2>
                  <p>
                    نام نمایشگاه همان چیزی است که بعداً در کارت و صفحه آگهی نمایش داده می‌شود.
                  </p>
                </div>

                <label className="field">
                  <span>نام نمایشگاه</span>
                  <input
                    value={dealerName}
                    onChange={(e) => setDealerName(e.target.value)}
                    placeholder="مثلاً نمایشگاه اتومبیل برتر"
                  />
                </label>

                <label className="field">
                  <span>شماره تماس نمایشگاه</span>
                  <input
                    value={dealerPhone}
                    onChange={(e) => setDealerPhone(normalizeDigits(e.target.value))}
                    placeholder="مثلاً 09120000000"
                    inputMode="tel"
                  />
                </label>

                <div className={cityHasNeighborhoods ? "threeCols" : "twoCols"}>
                  <label className="field">
                    <span>استان</span>
                    <select value={province} onChange={(e) => setProvince(e.target.value)}>
                      <option value="">انتخاب استان</option>
                      {provinces.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>شهر</span>
                    <select
                      value={city}
                      disabled={!province || geoLoading}
                      onChange={(e) => setCity(e.target.value)}
                    >
                      <option value="">
                        {province ? "انتخاب شهر" : "اول استان را انتخاب کنید"}
                      </option>
                      {cities.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  {cityHasNeighborhoods && (
                    <label className="field">
                      <span>محله</span>
                      <select
                        value={neighborhood}
                        disabled={!city || geoLoading}
                        onChange={(e) => setNeighborhood(e.target.value)}
                      >
                        <option value="">انتخاب محله</option>
                        {neighborhoods.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                {geoLoading && <div className="message hint">در حال دریافت موقعیت‌ها...</div>}

                <label className="field">
                  <span>آدرس کوتاه نمایشگاه</span>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="مثلاً بلوار اصلی، روبه‌روی..."
                  />
                </label>

                <button className="primaryBtn" disabled={saving} onClick={createDealer}>
                  {saving ? "در حال ثبت نمایشگاه..." : "ثبت نمایشگاه"}
                </button>

                {message && <div className="message success">{message}</div>}
                {error && <div className="message error">{error}</div>}
              </div>

              <div className="card">
                <div className="sectionHead">
                  <span>لیست نمایشگاه‌ها</span>
                  <h2>نمایشگاه‌های ثبت‌شده</h2>
                  <p>
                    بعد از اتصال به فرم ثبت آگهی، می‌توانید آگهی را شخصی یا به نام یکی از این نمایشگاه‌ها ثبت کنید.
                  </p>
                </div>

                {dealers.length === 0 && (
                  <div className="emptyBox">
                    هنوز نمایشگاهی ثبت نکرده‌اید.
                  </div>
                )}

                {dealers.length > 0 && (
                  <div className="dealerList">
                    {dealers.map((dealer) => (
                      <div className="dealerItem" key={dealer.id}>
                        <div>
                          <strong>{dealer.dealer_name || "نمایشگاه بدون نام"}</strong>
                          <span>
                            {[
                              dealer.province,
                              dealer.city,
                              dealer.neighborhood,
                            ]
                              .filter(Boolean)
                              .join("، ") || "موقعیت ثبت نشده"}
                          </span>
                        </div>

                        <div className="dealerMeta">
                          <small>{dealer.dealer_phone || "شماره تماس در صفحه عمومی ثبت نشده"}</small>
                          <b>{dealer.is_active === false || dealer.is_active === 0 ? "غیرفعال" : "فعال"}</b>
                          <a className="manageDealerLink" href={`/dealers/${dealer.id}`}>
                            مدیریت شعبه‌ها و اعضا
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <a className="secondaryLink" href="/account/listings/new">
                  رفتن به ثبت آگهی
                </a>
              </div>
            </div>
          </>
        )}
      </section>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #faf7ff;
        }

        .dealersPage {
          min-height: 100vh;
          font-family: Tahoma, Arial, sans-serif;
          color: #211335;
          background:
            radial-gradient(circle at 84% 10%, rgba(123, 44, 255, 0.16), transparent 32%),
            linear-gradient(180deg, #ffffff 0%, #faf7ff 52%, #ffffff 100%);
          padding: 24px;
        }

        .shell {
          width: min(1120px, 100%);
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          text-decoration: none;
          color: #211335;
        }

        .logoMark {
          width: 46px;
          height: 46px;
          border-radius: 17px;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          color: #fff;
          display: grid;
          place-items: center;
          font-weight: 900;
          box-shadow: 0 14px 30px rgba(109, 40, 217, 0.22);
        }

        .brand strong {
          display: block;
          font-size: 18px;
        }

        .brand span {
          display: block;
          margin-top: 3px;
          color: #7b6a91;
          font-size: 12px;
        }

        .navLinks {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .navLinks a {
          color: #6d28d9;
          background: #fff;
          border: 1px solid #eadcff;
          border-radius: 999px;
          padding: 10px 14px;
          text-decoration: none;
          font-size: 13px;
          font-weight: bold;
        }

        .heroCard,
        .card {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #eadcff;
          border-radius: 34px;
          padding: 34px;
          box-shadow: 0 24px 70px rgba(76, 29, 149, 0.12);
        }

        .heroCard {
          margin-bottom: 22px;
        }

        .centerCard {
          width: min(560px, 100%);
          margin: 80px auto 0;
          text-align: center;
        }

        .grid {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 22px;
          align-items: start;
        }

        .miniLabel,
        .sectionHead span {
          display: inline-block;
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 14px;
        }

        h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.45;
        }

        h2 {
          margin: 0 0 8px;
          font-size: 25px;
        }

        p {
          color: #6d5b83;
          line-height: 2.1;
          margin: 14px 0 0;
        }

        .sectionHead {
          margin-bottom: 20px;
        }

        .sectionHead p {
          margin-top: 8px;
          font-size: 13px;
        }

        .twoCols {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .threeCols {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .field {
          display: block;
          margin-bottom: 16px;
        }

        .field span {
          display: block;
          color: #6b5b82;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          border: 1px solid #e2d3ff;
          border-radius: 18px;
          padding: 15px;
          font-size: 15px;
          outline: 0;
          color: #24123d;
          background: #fff;
          font-family: inherit;
        }

        .field textarea {
          min-height: 120px;
          resize: vertical;
          line-height: 2;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.12);
        }

        .field select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .primaryLink,
        .primaryBtn,
        .manageDealerLink {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          padding: 8px 12px;
          border-radius: 12px;
          background: #6d28d9;
          color: #fff;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .secondaryLink {
          width: 100%;
          border: 0;
          border-radius: 17px;
          padding: 14px 16px;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          text-align: center;
          font-family: inherit;
        }

        .primaryLink,
        .primaryBtn {
          color: #fff;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
        }

        .secondaryLink {
          margin-top: 18px;
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
        }

        .primaryBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .message {
          margin-top: 16px;
          border-radius: 16px;
          padding: 13px;
          font-size: 13px;
          line-height: 1.9;
        }

        .success {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .error {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
        }

        .hint {
          background: #fffbeb;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        .emptyBox {
          border: 1px dashed #d7c2ff;
          background: #fbf8ff;
          color: #7b6a91;
          border-radius: 22px;
          padding: 24px;
          text-align: center;
          line-height: 2;
        }

        .dealerList {
          display: grid;
          gap: 12px;
        }

        .dealerItem {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid #eadcff;
          background: #fff;
          border-radius: 22px;
          padding: 16px;
        }

        .dealerItem strong {
          display: block;
          font-size: 15px;
          color: #24123d;
          margin-bottom: 6px;
        }

        .dealerItem span {
          display: block;
          font-size: 12px;
          color: #7b6a91;
          line-height: 1.9;
        }

        .dealerMeta {
          display: grid;
          justify-items: end;
          gap: 8px;
          align-content: center;
          min-width: 120px;
        }

        .dealerMeta small {
          color: #6d5b83;
          font-size: 11px;
        }

        .dealerMeta b {
          color: #166534;
          background: #dcfce7;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 11px;
        }

        .loader {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 4px solid #eadcff;
          border-top-color: #6d28d9;
          margin: 0 auto 18px;
          animation: spin 0.85s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .threeCols,
          .twoCols {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 680px) {
          .dealersPage {
            padding: 14px;
          }

          .heroCard,
          .card {
            padding: 24px;
            border-radius: 26px;
          }

          .topbar {
            align-items: flex-start;
            flex-direction: column;
          }

          h1 {
            font-size: 27px;
          }

          .dealerItem {
            flex-direction: column;
          }

          .dealerMeta {
            justify-items: start;
          }
        }
      `}</style>
    </main>
  );
}
