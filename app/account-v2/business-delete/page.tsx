"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type BusinessType = "dealer" | "parts_store" | "repair_shop" | "car_service";

type MeResponse = {
  success?: boolean;
  logged_in?: boolean;
  message?: string;
  user?: {
    id?: number;
    mobile?: string;
    business_name?: string | null;
    account_type?: string;
  } | null;
};

type DealerResponse = {
  success?: boolean;
  message?: string;
  dealer?: { id: number; name: string };
  role?: string;
};

type BusinessContext = {
  type: BusinessType;
  dealerId: number;
  name: string;
  owner: boolean;
  mobile: string;
};

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

function isBusinessType(value?: string): value is BusinessType {
  return value === "dealer" || value === "parts_store" || value === "repair_shop" || value === "car_service";
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

async function readJson(response: Response): Promise<ApiResponse> {
  try {
    return (await response.json()) as ApiResponse;
  } catch {
    return {};
  }
}

export default function BusinessDeletePage() {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [context, setContext] = useState<BusinessContext | null>(null);
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
        const meResponse = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const me = (await meResponse.json()) as MeResponse;

        if (!meResponse.ok || !me.success || !me.user) {
          throw new Error(me.message || "اطلاعات حساب دریافت نشد.");
        }

        if (!isBusinessType(me.user.account_type)) {
          throw new Error("کسب‌وکاری برای ثبت درخواست حذف در این حساب پیدا نشد.");
        }

        const type = me.user.account_type;
        const mobile = String(me.user.mobile || "");

        if (type === "dealer") {
          const dealerResponse = await fetch("/api/auth/dealer-command-center", {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
            headers: { Accept: "application/json", ...authHeaders() },
          });
          const dealer = (await dealerResponse.json()) as DealerResponse;
          if (!dealerResponse.ok || !dealer.success || !dealer.dealer) {
            throw new Error(dealer.message || "نمایشگاه متصل به حساب دریافت نشد.");
          }

          setContext({
            type,
            dealerId: Number(dealer.dealer.id || 0),
            name: dealer.dealer.name || "نمایشگاه خودرو",
            owner: dealer.role === "owner",
            mobile,
          });
        } else {
          setContext({
            type,
            dealerId: 0,
            name: String(me.user.business_name || typeLabel(type)),
            owner: true,
            mobile,
          });
        }
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "اطلاعات کسب‌وکار دریافت نشد.");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  const canConfirm = useMemo(
    () => Boolean(context?.owner && /^\d{5}$/.test(code) && !working && !ticket),
    [code, context?.owner, ticket, working],
  );

  async function sendCode() {
    if (!context?.owner || working || countdown > 0) return;
    setWorking(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/auth/business-deletion/send-code", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          activity_type: context.type,
          dealer_id: context.dealerId || undefined,
        }),
      });
      const payload = await readJson(response);
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
    if (!context || !canConfirm) return;
    setWorking(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/auth/business-deletion", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          activity_type: context.type,
          dealer_id: context.dealerId || undefined,
          code,
          reason,
        }),
      });
      const payload = await readJson(response);

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
          <p>حذف فوری انجام نمی‌شود. ابتدا مالک حساب با کد پیامکی تأیید می‌شود و بعد درخواست برای بررسی وابستگی‌های مجموعه ثبت خواهد شد.</p>
        </section>

        {loading ? <div className={styles.state}><span className={styles.loader} />در حال دریافت کسب‌وکار…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {notice ? <div className={styles.notice}>{notice}</div> : null}

        {!loading && context ? (
          <>
            <section className={styles.businessCard}>
              <div className={styles.businessIcon}>ک</div>
              <div>
                <span>{typeLabel(context.type)}</span>
                <strong>{context.name}</strong>
                <small>{context.owner ? "مالک مجموعه" : "عضو مجموعه"} · {maskMobile(context.mobile)}</small>
              </div>
              <b className={context.owner ? styles.ownerBadge : styles.memberBadge}>{context.owner ? "مجاز" : "غیرمجاز"}</b>
            </section>

            {!context.owner ? (
              <div className={styles.error}>درخواست حذف فقط توسط مالک مجموعه ثبت می‌شود. مدیر یا پرسنل می‌توانند از مالک بخواهند این عملیات را انجام دهد.</div>
            ) : ticket ? (
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
                      <input
                        value={code}
                        onChange={(event) => setCode(normalizeDigits(event.target.value))}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="•••••"
                      />
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
