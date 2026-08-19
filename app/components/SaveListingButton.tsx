"use client";

import { useEffect, useState } from "react";
import styles from "./SaveListingButton.module.css";

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
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.icon}
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

  useEffect(() => {
    let ignore = false;

    async function checkSavedStatus() {
      const id = Number(listingId);

      if (!id || !Number.isFinite(id)) {
        if (!ignore) setChecked(true);
        return;
      }

      try {
        const token = getToken();
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const response = await fetch(
          `${API_BASE}/api/save-listing.php?listing_id=${id}`,
          {
            method: "GET",
            headers,
            cache: "no-store",
          },
        );

        const text = await response.text();
        const json = JSON.parse(text) as {
          success: boolean;
          is_saved?: boolean;
        };

        if (!ignore && json.success) {
          setIsSaved(Boolean(json.is_saved));
        }
      } catch {
        // وضعیت اولیه دکمه حفظ می‌شود؛ خطای بررسی نباید ظاهر صفحه را خراب کند.
      } finally {
        if (!ignore) setChecked(true);
      }
    }

    void checkSavedStatus();

    return () => {
      ignore = true;
    };
  }, [listingId]);

  async function toggleSaved(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const id = Number(listingId);
    if (!id || !Number.isFinite(id) || loading) return;

    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/save-listing.php`, {
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

      const text = await response.text();
      let json: {
        success: boolean;
        message?: string;
        is_saved?: boolean;
      };

      try {
        json = JSON.parse(text) as typeof json;
      } catch {
        window.alert("پاسخ سرور برای نشان‌کردن معتبر نبود.");
        return;
      }

      if (!response.ok || !json.success) {
        window.alert(json.message || "عملیات نشان‌کردن انجام نشد.");
        return;
      }

      const nextSaved = Boolean(json.is_saved);
      setIsSaved(nextSaved);
      setChecked(true);
      onChange?.(nextSaved);
      window.dispatchEvent(
        new CustomEvent("chakod:saved-changed", {
          detail: { listingId: id, isSaved: nextSaved },
        }),
      );
    } catch {
      window.alert("ارتباط با سرور برای نشان‌کردن برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  const label = !checked
    ? "بررسی..."
    : isSaved
      ? "نشان‌شده"
      : "نشان کردن";

  return (
    <button
      type="button"
      onClick={toggleSaved}
      disabled={loading}
      title={isSaved ? "حذف از نشان‌شده‌ها" : "نشان کردن آگهی"}
      aria-label={isSaved ? "حذف از نشان‌شده‌ها" : "نشان کردن آگهی"}
      aria-pressed={isSaved}
      className={[
        styles.button,
        compact ? styles.compact : styles.full,
        isSaved ? styles.saved : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <span className={styles.loadingMark} aria-hidden="true">
          …
        </span>
      ) : (
        <BookmarkIcon filled={isSaved} />
      )}

      {!compact ? <span className={styles.label}>{label}</span> : null}
    </button>
  );
}
