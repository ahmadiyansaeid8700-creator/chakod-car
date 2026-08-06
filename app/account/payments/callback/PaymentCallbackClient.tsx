"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import MobileBottomNav from "../../../components/MobileBottomNav";
import styles from "./page.module.css";

type VerifyResponse = {
  success?: boolean;
  message?: string;
  reference_id?: string | number;
  invoice_id?: string | number;
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

export default function PaymentCallbackClient() {
  const [state, setState] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("در حال تأیید نتیجه پرداخت از سمت سرور...");
  const [referenceId, setReferenceId] = useState("");

  useEffect(() => {
    async function verifyPayment() {
      const params = new URLSearchParams(window.location.search);
      const authority =
        params.get("Authority") ||
        params.get("authority") ||
        params.get("token") ||
        "";
      const status = params.get("Status") || params.get("status") || "";

      if (!authority) {
        setState("failed");
        setMessage("شناسه بازگشت درگاه دریافت نشد.");
        return;
      }

      try {
        const response = await fetch("/api/payments/verify", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ authority, status }),
        });

        const text = await response.text();
        let result: VerifyResponse | null = null;
        try {
          result = text ? (JSON.parse(text) as VerifyResponse) : null;
        } catch {
          result = null;
        }

        if (!response.ok || !result?.success) {
          setState("failed");
          setMessage(result?.message || "تأیید پرداخت ناموفق بود.");
          return;
        }

        setState("success");
        setMessage(result.message || "پرداخت با موفقیت تأیید شد.");
        setReferenceId(String(result.reference_id || result.invoice_id || authority));
      } catch {
        setState("failed");
        setMessage("ارتباط با سرویس تأیید پرداخت برقرار نشد.");
      }
    }

    void verifyPayment();
  }, []);

  return (
    <main className={styles.page} dir="rtl">
      <section className={styles.card}>
        <Link className={styles.brand} href="/">
          <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
        </Link>
        <div className={`${styles.statusIcon} ${styles[state]}`}>
          {state === "loading" ? "…" : state === "success" ? "✓" : "!"}
        </div>
        <span className={styles.eyebrow}>نتیجه تراکنش</span>
        <h1>
          {state === "loading"
            ? "در حال بررسی پرداخت"
            : state === "success"
              ? "پرداخت موفق بود"
              : "پرداخت تکمیل نشد"}
        </h1>
        <p>{message}</p>
        {referenceId && (
          <div className={styles.reference}>
            <small>شناسه پیگیری</small>
            <strong>{referenceId}</strong>
          </div>
        )}
        <div className={styles.actions}>
          <Link className={styles.primary} href="/account/invoices">مشاهده فاکتورها</Link>
          <Link className={styles.secondary} href="/account/payments">بازگشت به پرداخت‌ها</Link>
        </div>
      </section>
      <MobileBottomNav />
    </main>
  );
}
