"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_BASE = "https://api.chakod.com";

type CoverImage = {
  image_id?: number;
  image_url?: string;
} | null;

type SavedListing = {
  saved_id: number;
  saved_at: string;
  is_saved: boolean;
  listing_id: number;
  id: number;
  title: string;
  brand: string;
  model: string;
  year: number | string | null;
  price_toman: number | string | null;
  mileage_km: number | string | null;
  province: string;
  city: string;
  neighborhood: string;
  listing_owner_type: "personal" | "dealer" | string;
  seller_display_name: string;
  dealer_id: number | null;
  category_code: string;
  cover_image: CoverImage;
  public_url: string;
};

type ApiResponse = {
  success: boolean;
  message: string;
  page?: number;
  limit?: number;
  total?: number;
  count?: number;
  data?: SavedListing[];
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function formatToman(value: number | string | null) {
  if (value === null || value === undefined || value === "") {
    return "قیمت توافقی";
  }

  const num = Number(value);

  if (!Number.isFinite(num) || num <= 0) {
    return "قیمت توافقی";
  }

  return new Intl.NumberFormat("fa-IR").format(num) + " تومان";
}

function formatKm(value: number | string | null) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const num = Number(value);

  if (!Number.isFinite(num) || num < 0) {
    return "";
  }

  return new Intl.NumberFormat("fa-IR").format(num) + " کیلومتر";
}

function getImageUrl(item: SavedListing) {
  const url = item.cover_image?.image_url || "";

  if (!url) {
    return "";
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    return API_BASE + url;
  }

  return API_BASE + "/" + url;
}

export default function SavedListingsPage() {
  const [items, setItems] = useState<SavedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [total, setTotal] = useState(0);

  const token = useMemo(() => getToken(), []);

  async function loadSavedListings() {
    setLoading(true);
    setMessage("");

    try {
      const currentToken = getToken();

      if (!currentToken) {
        setItems([]);
        setMessage("برای مشاهده آگهی‌های نشان‌شده ابتدا وارد حساب کاربری شوید.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/my-saved-listings.php?limit=30`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
        cache: "no-store",
      });

      const text = await res.text();

      let json: ApiResponse;

      try {
        json = JSON.parse(text);
      } catch {
        setMessage("API خروجی JSON معتبر نداد: " + text.slice(0, 300));
        setLoading(false);
        return;
      }

      if (!json.success) {
        setMessage(json.message || "خطا در دریافت آگهی‌های نشان‌شده.");
        setItems([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setItems(json.data || []);
      setTotal(json.total || 0);
    } catch (error) {
      console.error(error);
      setMessage("خطا در اتصال به سرور.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function removeSaved(listingId: number) {
    const currentToken = getToken();

    if (!currentToken) {
      setMessage("برای حذف از نشان‌شده‌ها ابتدا وارد حساب کاربری شوید.");
      return;
    }

    setRemovingId(listingId);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/save-listing.php`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listing_id: listingId,
          action: "remove",
        }),
      });

      const text = await res.text();

      let json: {
        success: boolean;
        message: string;
        is_saved?: boolean;
      };

      try {
        json = JSON.parse(text);
      } catch {
        setMessage("API خروجی JSON معتبر نداد: " + text.slice(0, 300));
        return;
      }

      if (!json.success) {
        setMessage(json.message || "حذف آگهی از نشان‌شده‌ها انجام نشد.");
        return;
      }

      setItems((prev) => prev.filter((item) => item.listing_id !== listingId));
      setTotal((prev) => Math.max(0, prev - 1));
      setMessage("آگهی از لیست نشان‌شده‌ها حذف شد.");
    } catch (error) {
      console.error(error);
      setMessage("خطا در اتصال به سرور.");
    } finally {
      setRemovingId(null);
    }
  }

  useEffect(() => {
    loadSavedListings();
  }, []);

  return (
    <main dir="rtl" className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <section className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">
        <div className="mb-6 rounded-[28px] bg-gradient-to-l from-slate-950 via-slate-900 to-zinc-800 p-5 text-white shadow-xl md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-sm text-white/60">حساب کاربری چاکود</p>
              <h1 className="text-2xl font-black md:text-3xl">
                آگهی‌های نشان‌شده
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
                آگهی‌هایی که برای بررسی بعدی ذخیره کرده‌ای اینجا نمایش داده می‌شوند.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <span className="text-white/60">تعداد ذخیره‌شده‌ها: </span>
              <strong className="text-lg text-white">
                {new Intl.NumberFormat("fa-IR").format(total)}
              </strong>
            </div>
          </div>
        </div>

        {message ? (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-72 animate-pulse rounded-[28px] bg-white shadow-sm"
              />
            ))}
          </div>
        ) : !token ? (
          <div className="rounded-[28px] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-3xl">
              🔐
            </div>
            <h2 className="text-xl font-black">ابتدا وارد حساب شوید</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              برای دیدن آگهی‌های نشان‌شده باید با شماره موبایل وارد چاکود شوی.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex rounded-2xl bg-slate-950 px-6 py-3 text-sm font-bold text-white"
            >
              ورود به حساب
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[28px] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-3xl">
              ♡
            </div>
            <h2 className="text-xl font-black">هنوز آگهی‌ای نشان نکرده‌ای</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              وقتی روی دکمه نشان آگهی‌ها بزنی، اینجا برای بررسی بعدی ذخیره می‌شوند.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-2xl bg-slate-950 px-6 py-3 text-sm font-bold text-white"
            >
              مشاهده آگهی‌ها
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const imageUrl = getImageUrl(item);
              const location = [item.province, item.city, item.neighborhood]
                .filter(Boolean)
                .join("، ");

              return (
                <article
                  key={item.saved_id}
                  className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <Link href={`/cars/${item.listing_id}`} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.title || "آگهی خودرو"}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-5xl text-slate-300">
                          🚗
                        </div>
                      )}

                      <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-800 shadow">
                        نشان‌شده
                      </div>

                      {item.listing_owner_type === "dealer" ? (
                        <div className="absolute bottom-3 right-3 rounded-full bg-slate-950/85 px-3 py-1 text-xs font-bold text-white">
                          نمایشگاه
                        </div>
                      ) : null}
                    </div>
                  </Link>

                  <div className="p-4">
                    <Link href={`/cars/${item.listing_id}`} className="block">
                      <h2 className="line-clamp-1 text-base font-black text-slate-950">
                        {item.title ||
                          [item.brand, item.model, item.year].filter(Boolean).join(" ")}
                      </h2>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        {item.brand ? <span>{item.brand}</span> : null}
                        {item.model ? <span>{item.model}</span> : null}
                        {item.year ? <span>{item.year}</span> : null}
                      </div>

                      <p className="mt-4 text-lg font-black text-slate-950">
                        {formatToman(item.price_toman)}
                      </p>

                      <div className="mt-3 space-y-2 text-xs leading-6 text-slate-500">
                        {formatKm(item.mileage_km) ? (
                          <p>{formatKm(item.mileage_km)}</p>
                        ) : null}

                        {location ? <p>{location}</p> : null}

                        {item.seller_display_name ? (
                          <p className="font-bold text-slate-700">
                            {item.seller_display_name}
                          </p>
                        ) : null}
                      </div>
                    </Link>

                    <div className="mt-4 flex gap-2">
                      <Link
                        href={`/cars/${item.listing_id}`}
                        className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-bold text-white"
                      >
                        مشاهده آگهی
                      </Link>

                      <button
                        type="button"
                        onClick={() => removeSaved(item.listing_id)}
                        disabled={removingId === item.listing_id}
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 disabled:opacity-50"
                      >
                        {removingId === item.listing_id ? "..." : "حذف"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
