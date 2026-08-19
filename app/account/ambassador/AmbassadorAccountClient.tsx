"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./AmbassadorAccountClient.module.css";

type LegalDocument = {
  id: number;
  document_key: string;
  version: string;
  title: string;
  summary?: string | null;
  body_text: string;
};

type Application = {
  id: number;
  full_name: string;
  province: string;
  city: string;
  preferred_channels: string[];
  experience_text?: string | null;
  why_join_text?: string | null;
  status: string;
  review_note?: string | null;
  submitted_at: string;
};

type Ambassador = {
  id: number;
  ambassador_code: string;
  status: string;
  level: string;
  commission_percent: number;
  daily_draft_limit: number;
  province: string;
  city: string;
};

type Payload = {
  success: boolean;
  message?: string;
  user?: { full_name?: string | null; mobile?: string; display_name?: string };
  settings?: {
    default_commission_percent: number;
    max_commission_percent: number;
    commission_hold_days: number;
    minimum_payout_toman: number;
    payout_cycle: string;
  };
  readiness?: { ready: boolean; open: boolean; missing: string[] };
  documents?: LegalDocument[];
  application?: Application | null;
  ambassador?: Ambassador | null;
};

const CHANNELS = [
  ["instagram", "اینستاگرام"],
  ["whatsapp", "واتساپ"],
  ["telegram", "تلگرام"],
  ["in_person", "مراجعه حضوری"],
  ["friends", "دوستان و آشنایان"],
  ["dealers", "نمایشگاه‌ها"],
  ["other", "سایر روش‌ها"],
] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار بررسی",
  reviewing: "در حال بررسی",
  changes_requested: "نیازمند اصلاح",
  approved: "تأیید شده",
  rejected: "رد شده",
  withdrawn: "پس گرفته شده",
  onboarding: "در حال تکمیل فعال‌سازی",
  active: "فعال",
  suspended: "تعلیق شده",
  terminated: "خاتمه یافته",
};

function tokenHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("fa-IR");
}

export default function AmbassadorAccountClient() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fullName, setFullName] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [whyJoin, setWhyJoin] = useState("");
  const [accepted, setAccepted] = useState<Record<number, boolean>>({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/ambassador", {
        cache: "no-store",
        headers: tokenHeaders(),
      });
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.success) throw new Error(payload.message || "دریافت اطلاعات انجام نشد.");
      setData(payload);
      setFullName(payload.application?.full_name || payload.user?.full_name || "");
      setProvince(payload.application?.province || "");
      setCity(payload.application?.city || "");
      setChannels(payload.application?.preferred_channels || []);
      setExperience(payload.application?.experience_text || "");
      setWhyJoin(payload.application?.why_join_text || "");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "ارتباط با سرویس برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const requiredDocuments = useMemo(
    () => (data?.documents || []).filter((item) => ["ambassador_agreement", "privacy_notice", "listing_rules"].includes(item.document_key)),
    [data],
  );

  function toggleChannel(value: string) {
    setChannels((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function submitApplication() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (!requiredDocuments.length || requiredDocuments.some((document) => !accepted[document.id])) {
        throw new Error("مطالعه و پذیرش صریح همه قوانین الزامی است.");
      }

      const headers = { "Content-Type": "application/json", ...tokenHeaders() };
      const acceptResponse = await fetch("/api/auth/ambassador", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "accept_documents",
          document_ids: requiredDocuments.map((document) => document.id),
        }),
      });
      const acceptPayload = (await acceptResponse.json()) as Payload;
      if (!acceptResponse.ok || !acceptPayload.success) throw new Error(acceptPayload.message || "ثبت پذیرش قوانین انجام نشد.");

      const applyResponse = await fetch("/api/auth/ambassador", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "apply",
          full_name: fullName,
          province,
          city,
          preferred_channels: channels,
          experience_text: experience,
          why_join_text: whyJoin,
        }),
      });
      const applyPayload = (await applyResponse.json()) as Payload;
      if (!applyResponse.ok || !applyPayload.success) throw new Error(applyPayload.message || "ثبت درخواست انجام نشد.");
      setMessage(applyPayload.message || "درخواست ثبت شد.");
      await load();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "ثبت درخواست انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function withdraw() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/auth/ambassador", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeaders() },
        body: JSON.stringify({ action: "withdraw_application" }),
      });
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.success) throw new Error(payload.message || "انصراف انجام نشد.");
      setMessage(payload.message || "درخواست پس گرفته شد.");
      await load();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "انصراف انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className={styles.shell}><div className={styles.loading}>در حال آماده‌سازی پنل سفیر…</div></main>;

  if (error && !data) {
    return (
      <main className={styles.shell}>
        <div className={styles.error}>{error}</div>
        <Link href="/login?returnTo=/account/ambassador" className={styles.primaryButton}>ورود به حساب چاکود</Link>
      </main>
    );
  }

  const application = data?.application;
  const ambassador = data?.ambassador;

  return (
    <main className={styles.shell} dir="rtl">
      <header className={styles.header}>
        <div><span>حساب کاربری</span><h1>سفیر چاکود</h1><p>ثبت درخواست، پذیرش قوانین و مشاهده وضعیت همکاری</p></div>
        <Link href="/ambassador" className={styles.outlineButton}>معرفی برنامه و قوانین</Link>
      </header>

      {message && <div className={styles.success}>{message}</div>}
      {error && <div className={styles.error}>{error}</div>}

      {ambassador && (
        <section className={styles.statusPanel}>
          <div><span>کد سفیر</span><strong>{ambassador.ambassador_code}</strong></div>
          <div><span>وضعیت</span><strong>{STATUS_LABELS[ambassador.status] || ambassador.status}</strong></div>
          <div><span>نرخ فعلی</span><strong>{formatNumber(ambassador.commission_percent)}٪</strong></div>
          <div><span>سقف پیش‌نویس روزانه</span><strong>{formatNumber(ambassador.daily_draft_limit)}</strong></div>
          <p>ثبت آگهی، احراز هویت و کیف پول در مرحله بعدی فعال می‌شود. تأیید درخواست به‌تنهایی به معنی اجازه دریافت وجه یا شروع تسویه نیست.</p>
        </section>
      )}

      {application && !["rejected", "changes_requested", "withdrawn"].includes(application.status) ? (
        <section className={styles.applicationCard}>
          <div className={styles.statusBadge}>{STATUS_LABELS[application.status] || application.status}</div>
          <h2>درخواست سفیر ثبت شده است</h2>
          <dl>
            <div><dt>نام</dt><dd>{application.full_name}</dd></div>
            <div><dt>محدوده فعالیت</dt><dd>{application.province}، {application.city}</dd></div>
            <div><dt>روش‌ها</dt><dd>{application.preferred_channels.map((value) => CHANNELS.find((item) => item[0] === value)?.[1] || value).join("، ")}</dd></div>
          </dl>
          {application.review_note && <div className={styles.reviewNote}>{application.review_note}</div>}
          {["pending", "reviewing"].includes(application.status) && <button type="button" className={styles.dangerButton} disabled={saving} onClick={withdraw}>پس گرفتن درخواست</button>}
        </section>
      ) : !ambassador && (
        <section className={styles.formCard}>
          {!data?.readiness?.open && (
            <div className={styles.closedBox}>
              <strong>ثبت درخواست عمومی هنوز باز نشده است.</strong>
              <span>{data?.readiness?.missing?.length ? `موارد باقی‌مانده: ${data.readiness.missing.join("، ")}` : "پس از نهایی‌شدن قوانین و اطلاعات قانونی، ثبت درخواست فعال می‌شود."}</span>
            </div>
          )}
          {application?.review_note && <div className={styles.reviewNote}><strong>نظر بررسی:</strong> {application.review_note}</div>}

          <div className={styles.formHeading}><span>مرحله اول</span><h2>درخواست عضویت سفیر</h2><p>در این مرحله اطلاعات مالی یا مدارک هویتی دریافت نمی‌شود. احراز هویت امن پس از تأیید اولیه انجام خواهد شد.</p></div>

          <div className={styles.grid}>
            <label><span>نام و نام خانوادگی</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={160} /></label>
            <label><span>استان فعالیت</span><input value={province} onChange={(event) => setProvince(event.target.value)} maxLength={100} /></label>
            <label><span>شهر فعالیت</span><input value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} /></label>
          </div>

          <fieldset className={styles.channels}>
            <legend>روش‌های جذب فروشنده</legend>
            {CHANNELS.map(([value, label]) => <label key={value}><input type="checkbox" checked={channels.includes(value)} onChange={() => toggleChannel(value)} /><span>{label}</span></label>)}
          </fieldset>

          <label className={styles.fullField}><span>تجربه مرتبط</span><textarea value={experience} onChange={(event) => setExperience(event.target.value)} maxLength={1200} rows={4} placeholder="مثلاً فعالیت در حوزه خودرو، فروش، شبکه‌های اجتماعی یا بازاریابی محلی" /></label>
          <label className={styles.fullField}><span>چرا می‌خواهید سفیر چاکود شوید؟</span><textarea value={whyJoin} onChange={(event) => setWhyJoin(event.target.value)} maxLength={1600} rows={4} /></label>

          <div className={styles.documents}>
            <h3>پذیرش صریح قوانین</h3>
            {requiredDocuments.map((document) => (
              <details key={document.id} className={styles.document}>
                <summary><div><strong>{document.title}</strong><small>نسخه {document.version}</small></div><span>مطالعه</span></summary>
                <div className={styles.documentBody}>{document.body_text}</div>
                <label className={styles.acceptRow}><input type="checkbox" checked={Boolean(accepted[document.id])} onChange={(event) => setAccepted((current) => ({ ...current, [document.id]: event.target.checked }))} /><span>این سند را مطالعه کردم و با نسخه فوق موافقم.</span></label>
              </details>
            ))}
          </div>

          <button type="button" className={styles.primaryButton} disabled={saving || !data?.readiness?.open} onClick={submitApplication}>
            {saving ? "در حال ثبت…" : application ? "ثبت مجدد درخواست" : "ثبت درخواست سفیر"}
          </button>
        </section>
      )}

      <section className={styles.financialBox}>
        <h2>قواعد مالی اولیه</h2>
        <div className={styles.financialGrid}>
          <div><span>حداکثر نرخ اعلامی</span><strong>{formatNumber(data?.settings?.max_commission_percent || 0)}٪</strong></div>
          <div><span>دوره انتظار</span><strong>{formatNumber(data?.settings?.commission_hold_days || 0)} روز</strong></div>
          <div><span>حداقل تسویه</span><strong>{formatNumber(data?.settings?.minimum_payout_toman || 0)} تومان</strong></div>
        </div>
        <p>مبلغ نهایی هر سفارش، مبنای محاسبه و نرخ همان سفارش قبل از شروع ثبت آگهی نمایش داده خواهد شد. هیچ مبلغی بابت ثبت‌نام خالی یا آگهی ردشده ایجاد نمی‌شود.</p>
      </section>
    </main>
  );
}
