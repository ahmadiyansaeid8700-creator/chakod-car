"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatDualDate } from "../../../lib/date-display";
import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./page.module.css";

type WalletSummary = {
  available_balance_toman: number;
  blocked_balance_toman: number;
  status: string;
};

type WalletTransaction = {
  id: number;
  direction: string;
  transactionType: string;
  amountToman: number;
  balanceAfterToman: number;
  status: string;
  description: string;
  createdAt: string;
};

type FinanceSummaryResponse = {
  success?: boolean;
  message?: string;
  wallet?: WalletSummary;
  transactions?: WalletTransaction[];
};

const statusTitles: Record<string, string> = {
  active: "فعال",
  disabled: "غیرفعال",
  completed: "تکمیل‌شده",
  reserved: "در حال پردازش",
  failed: "ناموفق",
};

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value || 0))} تومان`;
}

function formatDate(value?: string) {
  return value ? formatDualDate(value, true) : "";
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
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

export default function WalletClient() {
  const [summary, setSummary] = useState<FinanceSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWallet() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/finance/summary", {
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const result = await readJson<FinanceSummaryResponse>(response);
        if (cancelled) return;

        if (!response.ok || !result?.success) {
          setError(result?.message || "دریافت اطلاعات کیف پول انجام نشد.");
          return;
        }
        setSummary(result);
      } catch {
        if (!cancelled) setError("ارتباط با سرویس کیف پول برقرار نشد.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadWallet();
    return () => {
      cancelled = true;
    };
  }, []);

  const wallet = summary?.wallet;
  const transactions = summary?.transactions || [];

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/account" className={styles.back} aria-label="بازگشت به حساب">
            <span aria-hidden="true">←</span>
            <strong>حساب</strong>
          </Link>
          <h1>کیف پول</h1>
          <Link href="/" className={styles.logo} aria-label="چاکود">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
        </header>

        {loading ? (
          <section className={styles.stateCard}>
            <span className={styles.loader} aria-hidden="true" />
            <strong>در حال دریافت کیف پول…</strong>
          </section>
        ) : error ? (
          <section className={styles.stateCard}>
            <strong>اطلاعات کیف پول در دسترس نیست</strong>
            <p>{error}</p>
          </section>
        ) : (
          <>
            <section className={styles.balanceCard} aria-label="موجودی کیف پول">
              <span className={styles.balanceLabel}>موجودی قابل استفاده</span>
              <strong className={styles.balance}>{formatToman(wallet?.available_balance_toman || 0)}</strong>

              <div className={styles.balanceMeta}>
                <span>
                  <small>مسدودشده</small>
                  <b>{formatToman(wallet?.blocked_balance_toman || 0)}</b>
                </span>
                <span>
                  <small>وضعیت</small>
                  <b>{statusTitles[wallet?.status || ""] || wallet?.status || "نامشخص"}</b>
                </span>
              </div>

              <Link className={styles.chargeButton} href="/account/payments/checkout?type=wallet_charge">
                <span aria-hidden="true">＋</span>
                افزایش موجودی
              </Link>
            </section>

            <section className={styles.transactionsSection}>
              <div className={styles.sectionHead}>
                <div>
                  <span>گردش کیف پول</span>
                  <h2>تراکنش‌ها</h2>
                </div>
                <small>{new Intl.NumberFormat("fa-IR").format(transactions.length)} مورد</small>
              </div>

              {transactions.length ? (
                <div className={styles.transactionList}>
                  {transactions.slice(0, 12).map((item) => {
                    const credit = item.direction === "credit";
                    return (
                      <article className={styles.transaction} key={item.id}>
                        <span className={styles.transactionIcon} data-direction={credit ? "credit" : "debit"}>
                          {credit ? "+" : "−"}
                        </span>
                        <div className={styles.transactionCopy}>
                          <strong>{item.description || item.transactionType || "تراکنش کیف پول"}</strong>
                          <small>{formatDate(item.createdAt)}</small>
                        </div>
                        <div className={styles.transactionAmount} data-direction={credit ? "credit" : "debit"}>
                          <strong>{credit ? "+" : "−"}{formatToman(item.amountToman)}</strong>
                          <small>{statusTitles[item.status] || item.status || ""}</small>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.empty}>
                  <span aria-hidden="true">◌</span>
                  <strong>هنوز تراکنشی ثبت نشده</strong>
                  <p>بعد از اولین افزایش موجودی یا خرید با کیف پول، تراکنش‌ها اینجا نمایش داده می‌شوند.</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
