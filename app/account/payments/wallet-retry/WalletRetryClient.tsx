"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import MobileBottomNav from "../../../components/MobileBottomNav";
import styles from "./page.module.css";

type WalletRetryResponse = {
  success?: boolean;
  pending?: boolean;
  retryable?: boolean;
  message?: string;
  invoice_no?: string;
  order_no?: string;
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? {
        Authorization: `Bearer ${token}`,
        "X-Session-Token": token,
      }
    : {};
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

export default function WalletRetryClient() {
  const [orderNo, setOrderNo] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOrderNo((params.get("order_no") || "").trim());
  }, []);

  async function retry() {
    setMessage("");
    setError("");

    if (!orderNo || !/^[a-z0-9_-]{6,100}$/i.test(orderNo)) {
      setError("شماره سفارش معتبر نیست.");
      return;
    }

    const token = localStorage.getItem("chakod_session_token") || "";
    if (!token) {
      window.location.assign(
        `/login?returnTo=${encodeURIComponent(`/account/payments/wallet-retry?order_no=${orderNo}`)}`,
      );
      return;
    }

    setWorking(true);
    try {
      const response = await fetch("/api/finance/wallet/pay", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ order_no: orderNo }),
      });
      const result = await readJson<WalletRetryResponse>(response);

      if (response.status === 202 && result?.pending) {
        setMessage(
          result.message ||
            "تأیید Commerce هنوز قطعی نشده است. مبلغ دوباره برداشت نشده و همچنان رزرو است.",
        );
        return;
      }

      if (!response.ok || !result?.success) {
        setError(result?.message || "بررسی دوباره پرداخت کیف پول انجام نشد.");
        return;
      }

      setDone(true);
      setMessage(result.message || "پرداخت کیف پول نهایی شد.");
      if (result.invoice_no) {
        window.setTimeout(() => {
          window.location.assign(
            `/account/invoices?paid=wallet&invoice=${encodeURIComponent(result.invoice_no || "")}`,
          );
        }, 700);
      }
    } catch {
      setError("ارتباط با سرویس مالی برقرار نشد. مبلغ دوباره برداشت نمی‌شود.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/account/payments">← پرداخت‌های من</Link>
          <Link href="/" className={styles.brand}>
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        <section className={styles.card}>
          <span className={styles.eyebrow}>بازیابی امن پرداخت</span>
          <h1>بررسی دوباره پرداخت کیف پول</h1>
          <p>
            این صفحه فقط وضعیت همان سفارش را دوباره با Commerce همگام می‌کند.
            در Retry مبلغ جدیدی از کیف پول برداشت نمی‌شود.
          </p>

          <label>
            <span>شماره سفارش</span>
            <input
              dir="ltr"
              value={orderNo}
              onChange={(event) => setOrderNo(event.target.value.trim())}
              placeholder="شماره سفارش"
            />
          </label>

          {message && <div className={styles.notice}>{message}</div>}
          {error && <div className={styles.error}>{error}</div>}

          <button type="button" disabled={working || done} onClick={() => void retry()}>
            {done ? "نهایی شد" : working ? "در حال بررسی..." : "بررسی و ادامه نهایی‌سازی"}
          </button>

          <small>
            در صورت نامشخص‌بودن نتیجه شبکه، مبلغ در بخش موجودی مسدود نگه داشته
            می‌شود تا نتیجه قطعی شود؛ برداشت دوباره انجام نمی‌شود.
          </small>
        </section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
