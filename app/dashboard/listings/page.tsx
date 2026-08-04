"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = "https://api.chakod.com";

type DealerItem = {
  id: number;
  dealer_name: string;
  role?: string;
  role_title?: string;
  can_manage_team?: boolean;
  can_create_listing?: boolean;
  province?: string;
  city?: string;
  neighborhood?: string;
};

type ListingItem = {
  id: number;
  title: string;
  brand?: string;
  model?: string;
  year?: string | number | null;
  price_toman?: string | number | null;
  mileage_km?: string | number | null;
  province?: string;
  city?: string;
  neighborhood?: string;
  listing_owner_type?: "personal" | "dealer";
  seller_display_name?: string;
  dealer_id?: number | null;
  category_code?: string;
  status: {
    code: string;
    title: string;
    raw?: string;
  };
  cover_image?: {
    image_id: number;
    image_url: string;
  } | null;
  image_count: number;
  created_at?: string;
  updated_at?: string;
  manage_url?: string;
  public_url?: string;
};

type ListingsResponse = {
  success: boolean;
  message?: string;
  summary?: {
    total: number;
    active: number;
    pending: number;
    draft: number;
    inactive: number;
    rejected: number;
    expired: number;
    sold: number;
    deleted: number;
  };
  owner_summary?: {
    personal: number;
    dealer: number;
  };
  dealers?: DealerItem[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  data?: ListingItem[];
};

const statusFilters = [
  { value: "all", label: "همه" },
  { value: "active", label: "فعال" },
  { value: "pending", label: "در انتظار بررسی" },
  { value: "rejected", label: "رد شده" },
  { value: "inactive", label: "غیرفعال" },
  { value: "sold", label: "فروخته‌شده" },
];

const ownerFilters = [
  { value: "all", label: "همه آگهی‌ها" },
  { value: "personal", label: "شخصی" },
  { value: "dealer", label: "نمایشگاهی" },
];

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function formatNumber(value: number | string | null | undefined) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "۰";
  return n.toLocaleString("fa-IR");
}

function formatPrice(value: number | string | null | undefined) {
  const n = Number(value || 0);

  if (!Number.isFinite(n) || n <= 0) {
    return "قیمت توافقی";
  }

  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 1,
    })} میلیارد تومان`;
  }

  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 0,
    })} میلیون تومان`;
  }

  return `${n.toLocaleString("fa-IR")} تومان`;
}

function statusClass(code?: string) {
  switch (code) {
    case "active":
      return "active";
    case "pending":
      return "pending";
    case "rejected":
      return "rejected";
    case "sold":
      return "sold";
    case "inactive":
    case "expired":
    case "deleted":
    case "draft":
      return "inactive";
    default:
      return "pending";
  }
}

function categoryTitle(code?: string) {
  const map: Record<string, string> = {
    zero: "صفر و آماده تحویل",
    used: "کارکرده و کم‌کارکرد",
    preorder: "حواله و پیش‌فروش",
    freezone: "منطقه آزاد",
    classic: "کلاسیک و کلکسیونی",
  };

  return code ? map[code] || code : "دسته‌بندی ثبت نشده";
}

export default function DashboardListingsPage() {
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [dealers, setDealers] = useState<DealerItem[]>([]);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("all");
  const [owner, setOwner] = useState("all");
  const [dealerId, setDealerId] = useState("0");
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 12,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  });

  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    pending: 0,
    draft: 0,
    inactive: 0,
    rejected: 0,
    expired: 0,
    sold: 0,
    deleted: 0,
  });

  const [ownerSummary, setOwnerSummary] = useState({
    personal: 0,
    dealer: 0,
  });

  async function loadListings(nextPage = page) {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("per_page", "12");
      params.set("status", status);
      params.set("owner", owner);

      if (dealerId !== "0") {
        params.set("dealer_id", dealerId);
      }

      if (appliedSearch.trim()) {
        params.set("q", appliedSearch.trim());
      }

      const res = await fetch(`${API_BASE}/api/dashboard-listings.php?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json: ListingsResponse = await res.json();

      if (!json.success) {
        setError(json.message || "لیست آگهی‌ها دریافت نشد.");
        setListings([]);
        return;
      }

      setListings(Array.isArray(json.data) ? json.data : []);
      setDealers(Array.isArray(json.dealers) ? json.dealers : []);
      setPagination(
        json.pagination || {
          page: nextPage,
          per_page: 12,
          total: 0,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        }
      );

      setSummary({
        total: Number(json.summary?.total || 0),
        active: Number(json.summary?.active || 0),
        pending: Number(json.summary?.pending || 0),
        draft: Number(json.summary?.draft || 0),
        inactive: Number(json.summary?.inactive || 0),
        rejected: Number(json.summary?.rejected || 0),
        expired: Number(json.summary?.expired || 0),
        sold: Number(json.summary?.sold || 0),
        deleted: Number(json.summary?.deleted || 0),
      });

      setOwnerSummary({
        personal: Number(json.owner_summary?.personal || 0),
        dealer: Number(json.owner_summary?.dealer || 0),
      });
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
      setListings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadListings(page);
  }, [page, status, owner, dealerId, appliedSearch]);

  function applySearch() {
    setPage(1);
    setAppliedSearch(searchText.trim());
  }

  function clearFilters() {
    setStatus("all");
    setOwner("all");
    setDealerId("0");
    setSearchText("");
    setAppliedSearch("");
    setPage(1);
  }

  const attentionCount = useMemo(() => {
    return summary.pending + summary.rejected + summary.inactive + summary.expired;
  }, [summary]);

  return (
    <main className="listingsPage" dir="rtl">
      <section className="shell">
        <header className="topbar">
          <a href="/dashboard" className="brand">
            <div className="logoMark">چ</div>
            <div>
              <strong>چاکود</strong>
              <span>مدیریت آگهی‌های من</span>
            </div>
          </a>

          <nav className="navLinks">
            <a href="/dashboard">داشبورد</a>
            <a href="/submit">ثبت آگهی</a>
            <a href="/dealers">نمایشگاه</a>
            <a href="/account">حساب</a>
          </nav>
        </header>

        <section className="hero">
          <div>
            <span className="miniLabel">مرکز مدیریت آگهی‌ها</span>
            <h1>آگهی‌های من</h1>
            <p>
              اینجا همه آگهی‌های شخصی و نمایشگاهی شما یک‌جا نمایش داده می‌شود. می‌توانید فیلتر کنید،
              جستجو کنید و وارد صفحه مدیریت هر آگهی شوید.
            </p>
          </div>

          <div className="heroPanel">
            <div>
              <span>کل آگهی‌ها</span>
              <strong>{formatNumber(summary.total)}</strong>
            </div>
            <div>
              <span>نیازمند توجه</span>
              <strong>{formatNumber(attentionCount)}</strong>
            </div>
          </div>
        </section>

        <section className="statsGrid">
          <button
            className={`statCard ${status === "all" ? "activeFilter" : ""}`}
            onClick={() => {
              setStatus("all");
              setPage(1);
            }}
          >
            <span>همه آگهی‌ها</span>
            <strong>{formatNumber(summary.total)}</strong>
            <small>کل آگهی‌های قابل مدیریت</small>
          </button>

          <button
            className={`statCard ${status === "active" ? "activeFilter" : ""}`}
            onClick={() => {
              setStatus("active");
              setPage(1);
            }}
          >
            <span>فعال</span>
            <strong>{formatNumber(summary.active)}</strong>
            <small>منتشر شده</small>
          </button>

          <button
            className={`statCard ${status === "pending" ? "activeFilter" : ""}`}
            onClick={() => {
              setStatus("pending");
              setPage(1);
            }}
          >
            <span>در انتظار بررسی</span>
            <strong>{formatNumber(summary.pending)}</strong>
            <small>منتظر تأیید چاکود</small>
          </button>

          <button
            className={`statCard ${status === "rejected" ? "activeFilter" : ""}`}
            onClick={() => {
              setStatus("rejected");
              setPage(1);
            }}
          >
            <span>رد شده</span>
            <strong>{formatNumber(summary.rejected)}</strong>
            <small>نیازمند اصلاح</small>
          </button>

          <button
            className={`statCard ${status === "sold" ? "activeFilter" : ""}`}
            onClick={() => {
              setStatus("sold");
              setPage(1);
            }}
          >
            <span>فروخته‌شده</span>
            <strong>{formatNumber(summary.sold)}</strong>
            <small>آگهی‌های موفق</small>
          </button>
        </section>

        <section className="filterPanel">
          <div className="filterHead">
            <div>
              <span>فیلتر مدیریتی</span>
              <h2>جستجو و مرتب‌سازی آگهی‌ها</h2>
            </div>
            <button onClick={clearFilters}>پاک کردن فیلترها</button>
          </div>

          <div className="filtersGrid">
            <label className="field searchField">
              <span>جستجو</span>
              <div className="searchBox">
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      applySearch();
                    }
                  }}
                  placeholder="عنوان، برند، مدل، شهر یا نمایشگاه..."
                />
                <button onClick={applySearch}>جستجو</button>
              </div>
            </label>

            <label className="field">
              <span>وضعیت</span>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                {statusFilters.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>نوع مالکیت</span>
              <select
                value={owner}
                onChange={(e) => {
                  setOwner(e.target.value);
                  setPage(1);
                }}
              >
                {ownerFilters.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>نمایشگاه</span>
              <select
                value={dealerId}
                onChange={(e) => {
                  setDealerId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="0">همه نمایشگاه‌ها</option>
                {dealers.map((dealer) => (
                  <option key={dealer.id} value={dealer.id}>
                    {dealer.dealer_name || "نمایشگاه بدون نام"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="ownerSummary">
            <div>
              <span>آگهی شخصی</span>
              <strong>{formatNumber(ownerSummary.personal)}</strong>
            </div>
            <div>
              <span>آگهی نمایشگاهی</span>
              <strong>{formatNumber(ownerSummary.dealer)}</strong>
            </div>
          </div>
        </section>

        <section className="listPanel">
          <div className="panelHead">
            <div>
              <span>لیست آگهی‌ها</span>
              <h2>{formatNumber(pagination.total)} آگهی پیدا شد</h2>
            </div>
            <a href="/submit">ثبت آگهی جدید</a>
          </div>

          {loading && (
            <div className="centerCard small">
              <div className="loader" />
              <h2>در حال دریافت آگهی‌ها...</h2>
            </div>
          )}

          {!loading && error && (
            <div className="emptyBox errorBox">
              {error}
              <br />
              <button onClick={() => loadListings(page)}>تلاش دوباره</button>
            </div>
          )}

          {!loading && !error && listings.length === 0 && (
            <div className="emptyBox">
              آگهی‌ای با این فیلترها پیدا نشد.
              <br />
              می‌توانید فیلترها را پاک کنید یا آگهی جدید ثبت کنید.
            </div>
          )}

          {!loading && !error && listings.length > 0 && (
            <div className="listingGrid">
              {listings.map((listing) => (
                <article className="listingCard" key={listing.id}>
                  <div className="listingImage">
                    {listing.cover_image?.image_url ? (
                      <img src={listing.cover_image.image_url} alt={listing.title} />
                    ) : (
                      <span>بدون عکس</span>
                    )}

                    <b className={`statusBadge ${statusClass(listing.status?.code)}`}>
                      {listing.status?.title || "در انتظار بررسی"}
                    </b>
                  </div>

                  <div className="listingBody">
                    <div className="listingTop">
                      <strong>{listing.title || "آگهی بدون عنوان"}</strong>
                      <span>#{formatNumber(listing.id)}</span>
                    </div>

                    <p>
                      {[listing.brand, listing.model, listing.year].filter(Boolean).join("، ") ||
                        "مشخصات خودرو ثبت نشده"}
                    </p>

                    <div className="metaGrid">
                      <div>
                        <span>قیمت</span>
                        <b>{formatPrice(listing.price_toman)}</b>
                      </div>

                      <div>
                        <span>کارکرد</span>
                        <b>{formatNumber(listing.mileage_km)} کیلومتر</b>
                      </div>

                      <div>
                        <span>موقعیت</span>
                        <b>
                          {[listing.province, listing.city, listing.neighborhood]
                            .filter(Boolean)
                            .join("، ") || "ثبت نشده"}
                        </b>
                      </div>

                      <div>
                        <span>عکس‌ها</span>
                        <b>{formatNumber(listing.image_count)} عکس</b>
                      </div>
                    </div>

                    <div className="tagsRow">
                      <span>{categoryTitle(listing.category_code)}</span>
                      <span>
                        {listing.listing_owner_type === "dealer" ? "نمایشگاهی" : "شخصی"}
                      </span>
                      {listing.seller_display_name && <span>{listing.seller_display_name}</span>}
                    </div>

                    <div className="actionsRow">
                      <a href={`/dashboard/listings/${listing.id}`} className="manageBtn">
                        مدیریت
                      </a>
                      <a href={`/cars/${listing.id}`} className="viewBtn">
                        نمایش
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loading && !error && pagination.total_pages > 1 && (
            <div className="pagination">
              <button
                disabled={!pagination.has_prev}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                قبلی
              </button>

              <span>
                صفحه {formatNumber(pagination.page)} از {formatNumber(pagination.total_pages)}
              </span>

              <button
                disabled={!pagination.has_next}
                onClick={() => setPage((prev) => prev + 1)}
              >
                بعدی
              </button>
            </div>
          )}
        </section>
      </section>

      <nav className="mobileBottomNav" aria-label="منوی موبایل آگهی‌ها">
        <a href="/dashboard">
          <span>📊</span>
          <b>داشبورد</b>
        </a>
        <a href="/submit">
          <span>＋</span>
          <b>ثبت آگهی</b>
        </a>
        <a href="/dealers">
          <span>🏢</span>
          <b>نمایشگاه</b>
        </a>
        <a href="/account">
          <span>👤</span>
          <b>حساب</b>
        </a>
      </nav>

      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #faf7ff;
        }

        .listingsPage {
          min-height: 100vh;
          font-family: Tahoma, Arial, sans-serif;
          color: #211335;
          background:
            radial-gradient(circle at 86% 8%, rgba(124, 58, 237, 0.18), transparent 34%),
            radial-gradient(circle at 8% 46%, rgba(168, 85, 247, 0.12), transparent 30%),
            linear-gradient(180deg, #ffffff 0%, #faf7ff 48%, #ffffff 100%);
          padding: 24px;
        }

        .shell {
          width: min(1240px, 100%);
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
          width: 48px;
          height: 48px;
          border-radius: 18px;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          color: #fff;
          display: grid;
          place-items: center;
          font-weight: 900;
          box-shadow: 0 14px 30px rgba(109, 40, 217, 0.24);
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
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid #eadcff;
          border-radius: 999px;
          padding: 10px 14px;
          text-decoration: none;
          font-size: 13px;
          font-weight: bold;
        }

        .hero,
        .heroPanel,
        .statCard,
        .filterPanel,
        .listPanel,
        .centerCard,
        .listingCard {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #eadcff;
          box-shadow: 0 24px 70px rgba(76, 29, 149, 0.10);
          backdrop-filter: blur(12px);
        }

        .hero {
          border-radius: 34px;
          padding: 34px;
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
          align-items: center;
          margin-bottom: 20px;
        }

        .miniLabel {
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
          margin: 0;
          font-size: 20px;
          line-height: 1.7;
        }

        p {
          color: #6d5b83;
          line-height: 2.1;
          margin: 12px 0 0;
        }

        .heroPanel {
          border-radius: 28px;
          padding: 18px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          background: linear-gradient(135deg, #3b0764, #7c3aed);
          color: #fff;
        }

        .heroPanel div {
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.12);
          border-radius: 22px;
          padding: 16px;
        }

        .heroPanel span {
          display: block;
          color: rgba(255, 255, 255, 0.78);
          font-size: 12px;
          margin-bottom: 8px;
        }

        .heroPanel strong {
          font-size: 30px;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: 1.25fr repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        .statCard {
          text-align: right;
          border-radius: 26px;
          padding: 22px;
          font-family: inherit;
          cursor: pointer;
          border: 1px solid #eadcff;
          color: #211335;
        }

        .statCard.activeFilter {
          color: #fff;
          border-color: transparent;
          background:
            radial-gradient(circle at 90% 0%, rgba(255, 255, 255, 0.25), transparent 34%),
            linear-gradient(135deg, #6d28d9, #9333ea);
        }

        .statCard span {
          display: block;
          color: #7b6a91;
          font-size: 12px;
          margin-bottom: 10px;
        }

        .statCard.activeFilter span,
        .statCard.activeFilter small {
          color: rgba(255, 255, 255, 0.82);
        }

        .statCard strong {
          display: block;
          font-size: 32px;
          margin-bottom: 8px;
        }

        .statCard small {
          color: #7b6a91;
          line-height: 1.8;
        }

        .filterPanel,
        .listPanel {
          border-radius: 30px;
          padding: 26px;
          margin-bottom: 20px;
        }

        .filterHead,
        .panelHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        .filterHead span,
        .panelHead span {
          display: inline-block;
          color: #6d28d9;
          background: #f4ecff;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .filterHead button,
        .panelHead a {
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
          border-radius: 999px;
          padding: 9px 12px;
          text-decoration: none;
          font-size: 12px;
          font-weight: bold;
          white-space: nowrap;
          cursor: pointer;
          font-family: inherit;
        }

        .filtersGrid {
          display: grid;
          grid-template-columns: 1.5fr repeat(3, 1fr);
          gap: 14px;
          align-items: end;
        }

        .field span {
          display: block;
          color: #6b5b82;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .field input,
        .field select {
          width: 100%;
          border: 1px solid #e2d3ff;
          border-radius: 18px;
          padding: 14px;
          font-size: 14px;
          outline: 0;
          color: #24123d;
          background: #fff;
          font-family: inherit;
        }

        .field input:focus,
        .field select:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.12);
        }

        .searchBox {
          display: grid;
          grid-template-columns: 1fr 100px;
          gap: 8px;
        }

        .searchBox button {
          border: 0;
          border-radius: 18px;
          color: #fff;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
          cursor: pointer;
          font-family: inherit;
          font-weight: bold;
        }

        .ownerSummary {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 16px;
        }

        .ownerSummary div {
          border: 1px solid #eadcff;
          background: #fff;
          border-radius: 20px;
          padding: 14px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .ownerSummary span {
          color: #7b6a91;
          font-size: 13px;
        }

        .ownerSummary strong {
          color: #6d28d9;
        }

        .listingGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .listingCard {
          border-radius: 28px;
          overflow: hidden;
          background: #fff;
        }

        .listingImage {
          height: 190px;
          background: #f4ecff;
          display: grid;
          place-items: center;
          color: #8b5cf6;
          position: relative;
        }

        .listingImage img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .statusBadge {
          position: absolute;
          top: 12px;
          right: 12px;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 11px;
          background: #fef3c7;
          color: #92400e;
        }

        .statusBadge.active {
          background: #dcfce7;
          color: #166534;
        }

        .statusBadge.rejected {
          background: #ffe4e6;
          color: #be123c;
        }

        .statusBadge.sold {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .statusBadge.inactive {
          background: #f1f5f9;
          color: #475569;
        }

        .listingBody {
          padding: 18px;
        }

        .listingTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .listingTop strong {
          color: #211335;
          line-height: 1.8;
        }

        .listingTop span {
          color: #8b5cf6;
          background: #f4ecff;
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 11px;
          white-space: nowrap;
        }

        .listingBody p {
          margin: 0 0 14px;
          color: #7b6a91;
          font-size: 12px;
        }

        .metaGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }

        .metaGrid div {
          background: #fbf8ff;
          border: 1px solid #f0e7ff;
          border-radius: 16px;
          padding: 10px;
        }

        .metaGrid span {
          display: block;
          color: #7b6a91;
          font-size: 10px;
          margin-bottom: 5px;
        }

        .metaGrid b {
          color: #211335;
          font-size: 12px;
          line-height: 1.8;
        }

        .tagsRow {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 14px;
        }

        .tagsRow span {
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
          border-radius: 999px;
          padding: 6px 8px;
          font-size: 11px;
        }

        .actionsRow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .actionsRow a {
          text-decoration: none;
          text-align: center;
          border-radius: 999px;
          padding: 11px 12px;
          font-size: 13px;
          font-weight: bold;
        }

        .manageBtn {
          color: #fff;
          background: linear-gradient(135deg, #6d28d9, #9333ea);
        }

        .viewBtn {
          color: #6d28d9;
          background: #f4ecff;
          border: 1px solid #e4d4ff;
        }

        .centerCard {
          width: min(620px, 100%);
          margin: 40px auto;
          text-align: center;
          border-radius: 28px;
          padding: 28px;
        }

        .centerCard.small {
          width: 100%;
          margin: 0;
        }

        .emptyBox {
          border: 1px dashed #d7c2ff;
          background: #fbf8ff;
          color: #7b6a91;
          border-radius: 22px;
          padding: 28px;
          text-align: center;
          line-height: 2;
          font-size: 13px;
        }

        .errorBox {
          color: #be123c;
          background: #fff1f2;
          border-color: #fecdd3;
        }

        .errorBox button {
          margin-top: 12px;
          border: 0;
          border-radius: 999px;
          padding: 10px 14px;
          color: #fff;
          background: #be123c;
          cursor: pointer;
          font-family: inherit;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin-top: 22px;
          flex-wrap: wrap;
        }

        .pagination button {
          border: 1px solid #e4d4ff;
          background: #f4ecff;
          color: #6d28d9;
          border-radius: 999px;
          padding: 10px 16px;
          font-family: inherit;
          font-weight: bold;
          cursor: pointer;
        }

        .pagination button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .pagination span {
          color: #7b6a91;
          font-size: 13px;
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

        .mobileBottomNav {
          display: none;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1120px) {
          .hero,
          .filtersGrid {
            grid-template-columns: 1fr;
          }

          .statsGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .listingGrid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 760px) {
          .listingsPage {
            padding: 12px;
            padding-bottom: 94px;
          }

          .shell {
            width: 100%;
          }

          .topbar {
            position: sticky;
            top: 8px;
            z-index: 30;
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
            background: rgba(255, 255, 255, 0.86);
            backdrop-filter: blur(14px);
            border: 1px solid #eadcff;
            border-radius: 22px;
            padding: 10px;
            margin-bottom: 14px;
            box-shadow: 0 14px 40px rgba(76, 29, 149, 0.10);
          }

          .brand .logoMark {
            width: 42px;
            height: 42px;
            border-radius: 16px;
          }

          .brand strong {
            font-size: 16px;
          }

          .brand span {
            font-size: 11px;
          }

          .navLinks {
            width: 100%;
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 2px;
            scrollbar-width: none;
          }

          .navLinks::-webkit-scrollbar {
            display: none;
          }

          .navLinks a {
            white-space: nowrap;
            padding: 9px 12px;
            font-size: 12px;
            min-height: 38px;
            display: inline-flex;
            align-items: center;
          }

          .hero,
          .filterPanel,
          .listPanel {
            border-radius: 24px;
            padding: 20px;
          }

          h1 {
            font-size: 27px;
          }

          h2 {
            font-size: 17px;
          }

          p {
            font-size: 13px;
          }

          .heroPanel {
            padding: 14px;
            border-radius: 22px;
          }

          .heroPanel strong {
            font-size: 24px;
          }

          .statsGrid {
            display: flex;
            overflow-x: auto;
            gap: 10px;
            padding: 2px 2px 8px;
            margin-bottom: 14px;
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
          }

          .statsGrid::-webkit-scrollbar {
            display: none;
          }

          .statCard {
            min-width: 210px;
            scroll-snap-align: start;
            padding: 18px;
            border-radius: 22px;
          }

          .filterHead,
          .panelHead {
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
          }

          .searchBox {
            grid-template-columns: 1fr;
          }

          .searchBox button {
            min-height: 46px;
          }

          .ownerSummary {
            grid-template-columns: 1fr;
          }

          .listingGrid {
            grid-template-columns: 1fr;
          }

          .listingImage {
            height: 210px;
          }

          .metaGrid {
            grid-template-columns: 1fr;
          }

          .mobileBottomNav {
            position: fixed;
            right: 12px;
            left: 12px;
            bottom: 12px;
            z-index: 80;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            padding: 8px;
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid #eadcff;
            box-shadow: 0 18px 50px rgba(76, 29, 149, 0.18);
            backdrop-filter: blur(16px);
          }

          .mobileBottomNav a {
            text-decoration: none;
            color: #6d28d9;
            display: grid;
            place-items: center;
            gap: 3px;
            border-radius: 18px;
            padding: 8px 4px;
            min-height: 54px;
            background: #fbf8ff;
            border: 1px solid #f0e7ff;
            -webkit-tap-highlight-color: transparent;
          }

          .mobileBottomNav span {
            font-size: 18px;
            line-height: 1;
          }

          .mobileBottomNav b {
            font-size: 10px;
            line-height: 1.5;
          }
        }
      `}</style>
    </main>
  );
}
