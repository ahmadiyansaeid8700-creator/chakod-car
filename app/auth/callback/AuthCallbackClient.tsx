"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "./page.module.css";

type MeResponse = {
  success?: boolean;
  logged_in?: boolean;
  message?: string;
  user?: Record<string, unknown> | null;
};

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/account";
  if (value.startsWith("/login") || value.startsWith("/auth/callback")) return "/account";
  return value.slice(0, 500);
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

export default function AuthCallbackClient() {
  const [state, setState] = useState<"checking" | "success" | "failed">("checking");
  const [message, setMessage] = useState("در حال بررسی نشست و مقصد بازگشت...");

  useEffect(() => {
    async function resolveCallback() {
      const params = new URLSearchParams(window.location.search);
      const storedReturnTo = sessionStorage.getItem("chakod_auth_return_to");
      const returnTo = safeReturnTo(params.get("returnTo") || storedReturnTo);
      sessionStorage.removeItem("chakod_auth_return_to");

      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const text = await response.text();
        let payload: MeResponse | null = null;
        try {
          payload = text ? (JSON.parse(text) as MeResponse) : null;
        } catch {
          payload = null;
        }

        if (response.ok && payload?.success && payload.logged_in !== false && payload.user) {
          localStorage.setItem("chakod_user", JSON.stringify(payload.user));
          window.dispatchEvent(new Event("chakod:auth-changed"));
          setState("success");
          setMessage("ورود تأیید شد؛ در حال انتقال به صفحه مقصد هستید.");
          window.setTimeout(() => window.location.assign(returnTo), 500);
          return;
        }

        setState("failed");
        setMessage(payload?.message || "نشست معتبر برای تکمیل ورود پیدا نشد.");
        window.setTimeout(
          () => window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`),
          900,
        );
      } catch {
        setState("failed");
        setMessage("ارتباط با سرویس ورود برقرار نشد.");
      }
    }

    void resolveCallback();
  }, []);

  return (
    <main className={styles.page} dir="rtl">
      <section className={styles.card}>
        <Link className={styles.brand} href="/">
          <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
        </Link>
        <div className={`${styles.icon} ${styles[state]}`}>
          {state === "checking" ? "…" : state === "success" ? "✓" : "!"}
        </div>
        <h1>{state === "checking" ? "تکمیل ورود" : state === "success" ? "ورود موفق بود" : "ورود تکمیل نشد"}</h1>
        <p>{message}</p>
        {state === "failed" && <Link className={styles.action} href="/login">بازگشت به ورود</Link>}
      </section>
    </main>
  );
}
