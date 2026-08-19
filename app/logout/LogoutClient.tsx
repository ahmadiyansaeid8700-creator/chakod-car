"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "./page.module.css";

type LogoutResponse = {
  success?: boolean;
  message?: string;
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

function clearLocalSession() {
  localStorage.removeItem("chakod_session_token");
  localStorage.removeItem("chakod_user");
  localStorage.removeItem("chakod_identity");
  window.dispatchEvent(new Event("chakod:auth-changed"));
}

export default function LogoutClient() {
  const [message, setMessage] = useState("در حال پایان‌دادن نشست این دستگاه...");
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    async function runLogout() {
      try {
        const response = await fetch("/api/auth/logout", {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({}),
        });
        const text = await response.text();
        let payload: LogoutResponse | null = null;
        try {
          payload = text ? (JSON.parse(text) as LogoutResponse) : null;
        } catch {
          payload = null;
        }
        setMessage(payload?.message || "با موفقیت از حساب خارج شدید.");
      } catch {
        setMessage("نشست محلی پاک شد؛ پاسخ سرور دریافت نشد.");
      } finally {
        clearLocalSession();
        setFinished(true);
        window.setTimeout(() => window.location.assign("/"), 900);
      }
    }

    void runLogout();
  }, []);

  return (
    <main className={styles.page} dir="rtl">
      <section className={styles.card}>
        <Link href="/" className={styles.brand}>
          <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
        </Link>
        <div className={`${styles.icon} ${finished ? styles.done : ""}`}>
          {finished ? "✓" : "…"}
        </div>
        <h1>{finished ? "خروج انجام شد" : "در حال خروج"}</h1>
        <p>{message}</p>
        <Link className={styles.homeLink} href="/">بازگشت به صفحه اصلی</Link>
      </section>
    </main>
  );
}
