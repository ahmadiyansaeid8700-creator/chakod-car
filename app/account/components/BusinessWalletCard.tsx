"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  readActiveAccount,
  saveActiveAccount,
  type ActiveAccountSelection,
} from "../../lib/active-account";
import styles from "./BusinessWalletCard.module.css";

type WalletSummary = {
  available_balance_toman: number;
  blocked_balance_toman: number;
  status: string;
};

type FinanceResponse = {
  success?: boolean;
  message?: string;
  wallet?: WalletSummary;
};

type ActivitiesResponse = {
  success?: boolean;
  activities?: Array<{
    id: number;
    type: string;
    name: string;
    external_dealer_id?: number | null;
  }>;
};

type Props = {
  accountName: string;
  accountType: string;
  role?: string;
  activityId?: number;
  externalDealerId?: number;
};

function authHeaders(): Record<string, string> {
  const token = typeof window === "undefined" ? "" : localStorage.getItem("chakod_session_token") || "";
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value || 0))} تومان`;
}

function statusLabel(value?: string) {
  if (value === "active") return "فعال";
  if (value === "disabled") return "غیرفعال";
  return value || "نامشخص";
}

function matchesTarget(selection: ActiveAccountSelection, activityId?: number, externalDealerId?: number) {
  if (activityId && selection.kind === "activity" && selection.id === activityId) return true;
  if (externalDealerId && selection.kind === "activity" && Number(selection.external_dealer_id || 0) === externalDealerId) return true;
  if (externalDealerId && selection.kind === "membership" && selection.external_dealer_id === externalDealerId) return true;
  return false;
}

export default function BusinessWalletCard({
  accountName,
  accountType,
  role,
  activityId,
  externalDealerId,
}: Props) {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function resolveSelection(): Promise<ActiveAccountSelection | null> {
      const current = readActiveAccount();
      if (matchesTarget(current, activityId, externalDealerId)) return current;

      if (activityId) {
        return {
          kind: "activity",
          id: activityId,
          type: accountType,
          name: accountName,
          role,
          external_dealer_id: externalDealerId || null,
        };
      }

      if (externalDealerId) {
        if (role === "owner") {
          try {
            const response = await fetch("/api/auth/account-activities", {
              cache: "no-store",
              credentials: "include",
              headers: { Accept: "application/json", ...authHeaders() },
            });
            const payload = await readJson<ActivitiesResponse>(response);
            const owned = payload?.activities?.find(
              (item) => Number(item.external_dealer_id || 0) === externalDealerId,
            );
            if (response.ok && payload?.success && owned?.id) {
              return {
                kind: "activity",
                id: owned.id,
                type: owned.type || accountType,
                name: owned.name || accountName,
                role,
                external_dealer_id: externalDealerId,
              };
            }
          } catch {
            return null;
          }
          return null;
        }

        return {
          kind: "membership",
          type: accountType,
          name: accountName,
          external_dealer_id: externalDealerId,
          role,
        };
      }

      return null;
    }

    async function loadWallet() {
      setLoading(true);
      setError("");
      try {
        const selection = await resolveSelection();
        if (!selection) throw new Error("حساب مالی این مجموعه هنوز همگام نشده است.");
        saveActiveAccount(selection);

        const response = await fetch("/api/finance/summary", {
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const payload = await readJson<FinanceResponse>(response);
        if (!response.ok || !payload?.success || !payload.wallet) {
          throw new Error(payload?.message || "موجودی کیف پول دریافت نشد.");
        }
        if (!cancelled) setWallet(payload.wallet);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "موجودی کیف پول دریافت نشد.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadWallet();
    return () => {
      cancelled = true;
    };
  }, [accountName, accountType, activityId, externalDealerId, role]);

  return (
    <section className={styles.card} aria-label="کیف پول این حساب">
      <div className={styles.copy}>
        <span className={styles.eyebrow}>کیف پول این حساب</span>
        <div className={styles.titleRow}>
          <h2>موجودی</h2>
          <span className={styles.accountName}>{accountName}</span>
        </div>

        {loading ? (
          <strong className={`${styles.balance} ${styles.state}`}>در حال دریافت موجودی…</strong>
        ) : error ? (
          <strong className={`${styles.balance} ${styles.state} ${styles.error}`}>موجودی در دسترس نیست</strong>
        ) : (
          <>
            <strong className={styles.balance}>{formatToman(wallet?.available_balance_toman || 0)}</strong>
            <div className={styles.meta}>
              <span>مسدودشده: <b>{formatToman(wallet?.blocked_balance_toman || 0)}</b></span>
              <span>وضعیت: <b>{statusLabel(wallet?.status)}</b></span>
            </div>
          </>
        )}
      </div>

      <div className={styles.actions}>
        <Link className={styles.primary} href="/account/wallet">مدیریت کیف پول</Link>
        <Link className={styles.secondary} href="/account/payments/checkout?type=wallet_charge">افزایش موجودی</Link>
      </div>
    </section>
  );
}
