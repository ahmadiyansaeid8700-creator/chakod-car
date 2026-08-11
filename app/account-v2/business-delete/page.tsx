"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type BusinessType = "dealer" | "parts_store" | "repair_shop" | "car_service";
type Activity = {
  id: number;
  type: BusinessType;
  name: string;
  phone?: string;
  city?: string;
  external_dealer_id?: number | null;
};
type ActivitiesResponse = { success?: boolean; message?: string; activities?: Activity[] };
type MeResponse = { success?: boolean; message?: string; user?: { mobile?: string } | null };
type ApiResponse = {
  success?: boolean;
  message?: string;
  mobile_masked?: string;
  ticket_no?: string;
  tracking_url?: string;
};

const RESEND_SECONDS = 90;

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}
function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}
function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "")
    .slice(0, 5);
}
function typeLabel(type: BusinessType) {
  if (type === "dealer") return "نمایشگاه خودرو";
  if (type === "parts_store") return "فروشگاه قطعات";
  if (type === "repair_shop") return "تعمیرگاه خودرو";
  return "مرکز خدمات خودرو";
}
function maskMobile(value: string) {
  const mobile = String(value || "").trim();
  return mobile.length >= 11 ? `${mobile.slice(0, 4)}••••${mobile.slice(-3)}` : mobile;
}
async function readJson<T>(response: Response): Promise<T> {
  try { return (await response.json()) as T; } catch { return {} as T; }
}

export default function BusinessDeletePage() {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");
  const [ticket, setTicket] = useState<{ no: string; url: string } | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const requestedId = Math.round(Number(new URLSearchParams(window.location.search).get("activity_id") || 0));
        const [activitiesResponse, meResponse] = await Promise.all([
          fetch("/api/auth/account-activities", {
            credentials: "include", cache: "no-store", signal: controller.signal,
            headers: { Accept: "application/json", ...authHeaders() },
          }),
          fetch("/api/auth/me", {
            credentials: "include", cache: "no-store", signal: controller.signal,
            headers: { Accept: "application/json", ...authHeaders() },
          }),
        ]);
        const activitiesPayload = await readJson<ActivitiesResponse>(activitiesResponse);
        const mePayload = await readJson<MeResponse>(meResponse);
        if (!activitiesResponse.ok || !activitiesPayload.success) throw new Error(activitiesPayload.message || "کسب‌وکارهای حساب دریافت نشد.");
        if (!meResponse.ok || !mePayload.success || !mePayload.user) throw new Error(mePayload.message || "اطلاعات حساب دریافت نشد.");

        const list = Array.isArray(activitiesPayload.activities) ? activitiesPayload.activities : [];
        const selected = requestedId > 0 ? list.find((item) => item.id === requestedId) : list[0];
        if (!selected) throw new Error("کسب‌وکار انتخاب‌شده در حساب شما پیدا نشد.");

        setActivity(selected);
        setMobile(String(mePayload.user.mobile || ""));
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError(caught instanceof Error ? caught.message : "اطلاعات کسب‌وکار دریافت نشد.");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const canConfirm = useMemo(
    () => Boolean(activity && /^\d{5}$/.test(code) && !working && !ticket),
    [activity, code, ticket, working],
  );

  async function sendCode() {
    if (!activity || working || countdown > 0) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/business-deletion/send-code", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ activity_id: activity.id }),
      });
      const payload = await readJson<ApiResponse>(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "ارسال کد انجام نشد.");
      setCodeSent(true);
      setCode("");
      setCountdown(RESEND_SECONDS);
      setNotice(payload.message || "کد تأیید ارسال شد.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ارسال کد انجام نشد.");
    } finally {
      setWorking(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!activity || !canConfirm) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/business-deletion", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ activity_id: activity.id, code, reason }),
      });
      const payload = await readJson<ApiResponse>(response);
      if (response.status === 409 && payload.ticket_no && payload.tracking_url) {
        setTicket({ no: payload.ticket_no, url: payload.tracking_url });
        setNotice(payload.message || "برای این کسب‌وکار قبلاً درخواست حذف ثبت شده است.");
        return;
      }
      if (!response.ok || !payload.success || !payload.ticket_no || !payload.tracking_url) {
        throw new Error(payload.message || "ثبت درخواست حذف انجام نشد.");
      }
      setTicket({ no: payload.ticket_no, url: payload.tracking_url });
      setNotice(payload.message || "درخواست حذف ثبت شد.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ثبت درخواست حذف انجام نشد.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/account" className={styles.back}>بازگشت به حساب</Link>
          <Link href="/" className={styles.logo}><img src="/brand/chakod-logo-horizontal.png" alt="چاکود" /></Link>
        </header>

        <section className={styles.hero}>
          <span>مدیریت کسب‌وکار</span>
          <h1>درخواست حذف کسب‌وکار</h1>
          <p>حذف فوری انجام نمی‌شود. ابتدا مالک حساب با کد پیامکی تأیید می‌شود و بعد درخواست برای بررسی وابستگی‌های همان مجموعه ثبت می‌شود.</p>
        </section>

        {loading ? <div className={styles.state}><span className={styles.loader} />در حال دریافت کسب‌وکار…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {notice ? <div className={styles.notice}>{notice}</div> : null}

        {!loading && activity ? (
          <>
            <section className={styles.businessCard}>
              <div className={styles.businessIcon}>ک</div>
              <div>
                <span>{typeLabel(activity.type)}</span>
                <strong>{activity.name}</strong>
                <small>مالک مجموعه · {maskMobile(mobile)}</small>
              </div>
              <b className={styles.ownerBadge}>مجاز</b>
            </section>

            {ticket ? (
              <section className={styles.doneCard}>
                <span>درخواست ثبت شد</span>
                <h2>{ticket.no}</h2>
                <p>تا زمان بررسی، کسب‌وکار و اطلاعات آن حذف نمی‌شود.</p>
                <Link href={ticket.url}>مشاهده و پیگیری درخواست</Link>
              </section>
            ) : (
              <form className={styles.form} onSubmit={submit}>
                <div className={styles.warning}>
                  <strong>قبل از حذف بررسی می‌کنیم</strong>
                  <p>آگهی‌ها، اعضای تیم، پرداخت‌ها، تبلیغات و تعهدهای باز باید تعیین تکلیف شوند. ثبت درخواست به معنی حذف فوری نیست.</p>
                </div>

                <div className={styles.stepHead}>
                  <span>۱</span>
                  <div><strong>تأیید شماره صاحب حساب</strong><small>کد فقط به شماره همین حساب ارسال می‌شود.</small></div>
                </div>

                <button className={styles.sendButton} type="button" disabled={working || countdown > 0} onClick={() => void sendCode()}>
                  {working && !codeSent ? "در حال ارسال…" : countdown > 0 ? `ارسال مجدد تا ${countdown} ثانیه` : codeSent ? "ارسال مجدد کد" : "ارسال کد تأیید"}
                </button>

                {codeSent ? (
                  <>
                    <label className={styles.field}>
                      <span>کد ۵ رقمی</span>
                      <input value={code} onChange={(event) => setCode(normalizeDigits(event.target.value))} inputMode="numeric" autoComplete="one-time-code" placeholder="•••••" />
                    </label>
                    <label className={styles.field}>
                      <span>دلیل حذف <small>اختیاری</small></span>
                      <textarea value={reason} maxLength={800} onChange={(event) => setReason(event.target.value)} placeholder="اگر مایلید دلیل درخواست را بنویسید." />
                    </label>
                    <button className={styles.deleteButton} type="submit" disabled={!canConfirm}>
                      {working ? "در حال بررسی کد…" : "تأیید کد و ثبت درخواست حذف"}
                    </button>
                  </>
                ) : null}
              </form>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
