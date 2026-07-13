"use client";

import { useEffect, useState } from "react";

const API_BASE = "https://api.chakod.com";

type SaveListingButtonProps = {
  listingId: number | string;
  className?: string;
  compact?: boolean;
  initialSaved?: boolean;
  onChange?: (isSaved: boolean) => void;
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M7.5 4.75C7.5 3.78 8.28 3 9.25 3h5.5c.97 0 1.75.78 1.75 1.75v15.1c0 .75-.86 1.17-1.45.7L12 18.12l-3.05 2.43c-.59.47-1.45.05-1.45-.7V4.75Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SaveListingButton({
  listingId,
  className = "",
  compact = false,
  initialSaved = false,
  onChange,
}: SaveListingButtonProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  async function checkSavedStatus() {
    const id = Number(listingId);

    if (!id || !Number.isFinite(id)) {
      setChecked(true);
      return;
    }

    try {
      const token = getToken();
      const headers: HeadersInit = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/api/save-listing.php?listing_id=${id}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const text = await res.text();

      let json: {
        success: boolean;
        is_saved?: boolean;
      };

      try {
        json = JSON.parse(text);
      } catch {
        setChecked(true);
        return;
      }

      if (json.success) {
        setIsSaved(Boolean(json.is_saved));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setChecked(true);
    }
  }

  async function toggleSaved(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const id = Number(listingId);

    if (!id || !Number.isFinite(id)) {
      return;
    }

    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/save-listing.php`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listing_id: id,
          action: "toggle",
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
        alert("API خروجی JSON معتبر نداد: " + text.slice(0, 200));
        return;
      }

      if (!json.success) {
        alert(json.message || "عملیات نشان کردن آگهی انجام نشد.");
        return;
      }

      const nextSaved = Boolean(json.is_saved);

      setIsSaved(nextSaved);
      onChange?.(nextSaved);
    } catch (error) {
      console.error(error);
      alert("خطا در اتصال به سرور.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkSavedStatus();
  }, [listingId]);

  const baseClass =
    "inline-flex items-center justify-center rounded-full transition active:scale-95 disabled:opacity-60";

  const sizeClass = compact
    ? "h-10 w-10"
    : "gap-2 px-4 py-2 text-sm font-bold";

  const colorClass = isSaved
    ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20"
    : "bg-white/95 text-slate-800 shadow ring-1 ring-black/5 hover:bg-slate-50 hover:text-slate-950";

  return (
    <button
      type="button"
      onClick={toggleSaved}
      disabled={loading}
      title={isSaved ? "حذف از نشان‌شده‌ها" : "نشان کردن آگهی"}
      aria-label={isSaved ? "حذف از نشان‌شده‌ها" : "نشان کردن آگهی"}
      className={`${baseClass} ${sizeClass} ${colorClass} ${className}`}
    >
      {loading ? (
        <span className="text-base leading-none">…</span>
      ) : (
        <BookmarkIcon filled={isSaved} />
      )}

      {!compact ? (
        <span>
          {!checked ? "بررسی..." : isSaved ? "نشان‌شده" : "نشان کردن"}
        </span>
      ) : null}
    </button>
  );
}