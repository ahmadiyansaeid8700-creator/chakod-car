"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./AmbassadorAdminClient.module.css";

type LegalIdentity = {
  legal_name?: string;
  national_id?: string;
  registration_no?: string;
  support_mobile?: string;
  support_email?: string;
  legal_address?: string;
};

type Settings = {
  program_active: boolean;
  applications_open: boolean;
  public_title: string;
  public_description: string;
  default_commission_percent: number;
  max_commission_percent: number;
  commission_hold_days: number;
  minimum_payout_toman: number;
  payout_cycle: string;
  new_ambassador_daily_limit: number;
  seller_confirmation_required: boolean;
  direct_payment_only: boolean;
  legal_identity: LegalIdentity;
};

type LegalDocument = {
  id: number;
  document_key: string;
  version: string;
  title: string;
  summary?: string | null;
  body_text: string;
  audience: string;
  status: string;
  published_at?: string | null;
  updated_at?: string | null;
};

type Application = {
  id: number;
  auth_user_id: number;
  full_name: string;
  mobile: string;
  province: string;
  city: string;
  preferred_channels: string[];
  experience_text?: string | null;
  why_join_text?: string | null;
  status: string;
  review_note?: string | null;
  submitted_at: string;
  ambassador_id?: number | null;
  ambassador_code?: string | null;
  ambassador_status?: string | null;
  commission_percent?: number | null;
  daily_draft_limit?: number | null;
};

type Payload = {
  success: boolean;
  message?: string;
  settings?: Settings;
  readiness?: { ready: boolean; open: boolean; missing: string[] };
  documents?: LegalDocument[];
  applications?: Application[];
  stats?: Record<string, number>;
};

type Tab = "overview" | "applications" | "documents" | "settings";

const DOCUMENT_KEYS = [
  ["ambassador_agreement", "قرارداد سفیر", "ambassador"],
  ["privacy_notice", "حریم خصوصی", "ambassador"],
  ["listing_rules", "ضوابط آگهی", "ambassador"],
  ["seller_consent", "رضایت‌نامه مالک", "seller"],
] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار",
  reviewing: "در حال بررسی",
  changes_requested: "نیازمند اصلاح",
  approved: "تأیید شده",
  rejected: "رد شده",
  withdrawn: "پس گرفته شده",
  onboarding: "فعال‌سازی اولیه",
  active: "فعال",
  suspended: "تعلیق",
  terminated: "خاتمه",
};

function tokenHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

function formatNumber(value: number | undefined | null) {
  return Number(value || 0).toLocaleString("fa-IR");
}

function nextVersion(current?: string) {
  const match = String(current || "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return "1.0.0";
  return `${match[1]}.${Number(match[2]) + 1}.0`;
}

export default function AmbassadorAdminClient() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<Payload | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [documentKey, setDocumentKey] = useState("ambassador_agreement");
  const [documentVersion, setDocumentVersion] = useState("1.0.0");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentSummary, setDocumentSummary] = useState("");
  const [documentBody, setDocumentBody] = useState("");

  async function load(filter = statusFilter) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/ambassadors?status=${encodeURIComponent(filter)}`, {
        cache: "no-store",
        headers: tokenHeaders(),
      });
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.success) throw new Error(payload.message || "دریافت اطلاعات انجام نشد.");
      setData(payload);
      setSettings(payload.settings || null);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "ارتباط با سرویس برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("all");
  }, []);

  const latestDocuments = useMemo(() => {
    const map = new Map<string, LegalDocument>();
    for (const document of data?.documents || []) {
      const current = map.get(document.document_key);
      if (!current || document.id > current.id) map.set(document.document_key, document);
    }
    return map;
  }, [data]);

  function useLatestDocument(key: string) {
    setDocumentKey(key);
    const document = latestDocuments.get(key);
    const meta = DOCUMENT_KEYS.find((item) => item[0] === key);
    setDocumentVersion(nextVersion(document?.version));
    setDocumentTitle(document?.title || meta?.[1] || "");
    setDocumentSummary(document?.summary || "");
    setDocumentBody(document?.body_text || "");
  }

  async function patch(body: Record<string, unknown>) {
    const response = await fetch("/api/admin/ambassadors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...tokenHeaders() },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as Payload;
    if (!response.ok || !payload.success) throw new Error(payload.message || "عملیات انجام نشد.");
    return payload;
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = await patch({ action: "update_settings", ...settings });
      setMessage(payload.message || "تنظیمات ذخیره شد.");
      await load(statusFilter);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "ذخیره تنظیمات انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function review(application: Application, decision: string) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = await patch({
        action: "review_application",
        application_id: application.id,
        decision,
        review_note: reviewNotes[application.id] || "",
      });
      setMessage(payload.message || "نتیجه ثبت شد.");
      await load(statusFilter);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "ثبت نتیجه انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function setAmbassadorStatus(application: Application, status: string) {
    if (!application.ambassador_id) return;
    setSaving(true);
    setError("");
    try {
      const payload = await patch({
        action: "set_ambassador_status",
        ambassador_id: application.ambassador_id,
        status,
        reason: reviewNotes[application.id] || "",
      });
      setMessage(payload.message || "وضعیت سفیر تغییر کرد.");
      await load(statusFilter);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "تغییر وضعیت انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDocument(publish: boolean) {
    const meta = DOCUMENT_KEYS.find((item) => item[0] === documentKey);
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = await patch({
        action: "save_document",
        document_key: documentKey,
        version: documentVersion,
        title: documentTitle,
        summary: documentSummary,
        body_text: documentBody,
        audience: meta?.[2] || "ambassador",
        publish,
      });
      setMessage(payload.message || "سند ذخیره شد.");
      await load(statusFilter);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "ذخیره سند انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <main className={styles.shell}><div className={styles.loading}>در حال دریافت پنل سفیران…</div></main>;

  return (
    <main className={styles.shell} dir="rtl">
      <header className={styles.header}>
        <div><span>مدیریت چاکود</span><h1>مرکز سفیران و قوانین</h1><p>فعال‌سازی برنامه، انتشار نسخه قوانین و بررسی درخواست‌ها</p></div>
        <div className={styles.headerActions}><Link href="/admin/commerce">مدیریت مالی</Link><Link href="/ambassador">صفحه عمومی سفیران</Link></div>
      </header>

      <nav className={styles.tabs}>
        {(["overview", "applications", "documents", "settings"] as Tab[]).map((item) => (
          <button key={item} type="button" className={tab === item ? styles.activeTab : ""} onClick={() => setTab(item)}>
            {{ overview: "نمای کلی", applications: "درخواست‌ها", documents: "قوانین", settings: "تنظیمات" }[item]}
          </button>
        ))}
      </nav>

      {message && <div className={styles.success}>{message}</div>}
      {error && <div className={styles.error}>{error}</div>}

      {tab === "overview" && (
        <>
          <section className={styles.readiness}>
            <div><span>آمادگی حقوقی</span><strong>{data?.readiness?.ready ? "کامل" : "ناقص"}</strong></div>
            <div><span>ثبت درخواست</span><strong>{data?.readiness?.open ? "باز" : "بسته"}</strong></div>
            <div><span>درخواست‌های منتظر</span><strong>{formatNumber(data?.stats?.pending)}</strong></div>
            <div><span>سفیران فعال</span><strong>{formatNumber(data?.stats?.ambassadors_active)}</strong></div>
          </section>
          {!data?.readiness?.ready && <section className={styles.warning}><strong>برنامه هنوز نباید عمومی شود.</strong><p>موارد ناقص: {data?.readiness?.missing?.join("، ") || "نامشخص"}</p></section>}
          <section className={styles.checklist}>
            <h2>ترتیب امن فعال‌سازی</h2>
            <ol>
              <li>مشخصات قانونی بهره‌بردار و پشتیبانی را در تنظیمات ثبت کنید.</li>
              <li>چهار سند را با وکیل بررسی، نسخه‌گذاری و منتشر کنید.</li>
              <li>ابتدا برنامه را فعال و ثبت درخواست را بسته نگه دارید.</li>
              <li>صفحه عمومی و فرایند پذیرش را آزمایش کنید.</li>
              <li>پس از تست، گزینه «ثبت درخواست‌ها باز باشد» را فعال کنید.</li>
            </ol>
          </section>
        </>
      )}

      {tab === "applications" && (
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><h2>درخواست‌های سفیر</h2><p>تأیید اولیه فقط حساب سفیر را در وضعیت فعال‌سازی قرار می‌دهد.</p></div><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); void load(event.target.value); }}><option value="all">همه وضعیت‌ها</option><option value="pending">در انتظار</option><option value="reviewing">در حال بررسی</option><option value="changes_requested">نیازمند اصلاح</option><option value="approved">تأیید شده</option><option value="rejected">رد شده</option></select></div>
          <div className={styles.applicationList}>
            {(data?.applications || []).map((application) => (
              <article key={application.id} className={styles.application}>
                <div className={styles.applicationTop}><div><strong>{application.full_name}</strong><span>{application.mobile} · {application.province}، {application.city}</span></div><b>{STATUS_LABELS[application.status] || application.status}</b></div>
                <div className={styles.applicationMeta}><span>روش‌ها: {application.preferred_channels.join("، ") || "ثبت نشده"}</span><span>ثبت: {application.submitted_at}</span>{application.ambassador_code && <span>کد: {application.ambassador_code}</span>}</div>
                {application.experience_text && <p><strong>تجربه:</strong> {application.experience_text}</p>}
                {application.why_join_text && <p><strong>هدف:</strong> {application.why_join_text}</p>}
                <textarea rows={3} value={reviewNotes[application.id] || application.review_note || ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [application.id]: event.target.value }))} placeholder="یادداشت بررسی؛ برای رد، اصلاح، تعلیق یا خاتمه الزامی است" />
                <div className={styles.actionRow}>
                  {!application.ambassador_id && <><button disabled={saving} onClick={() => review(application, "reviewing")}>در حال بررسی</button><button className={styles.approve} disabled={saving} onClick={() => review(application, "approved")}>تأیید اولیه</button><button disabled={saving} onClick={() => review(application, "changes_requested")}>درخواست اصلاح</button><button className={styles.reject} disabled={saving} onClick={() => review(application, "rejected")}>رد</button></>}
                  {application.ambassador_id && <><button className={styles.approve} disabled={saving} onClick={() => setAmbassadorStatus(application, "active")}>فعال‌کردن</button><button disabled={saving} onClick={() => setAmbassadorStatus(application, "suspended")}>تعلیق</button><button className={styles.reject} disabled={saving} onClick={() => setAmbassadorStatus(application, "terminated")}>خاتمه</button></>}
                </div>
              </article>
            ))}
            {!data?.applications?.length && <div className={styles.empty}>درخواستی در این وضعیت وجود ندارد.</div>}
          </div>
        </section>
      )}

      {tab === "documents" && (
        <section className={styles.documentLayout}>
          <aside className={styles.documentMenu}>
            <h2>اسناد برنامه</h2>
            {DOCUMENT_KEYS.map(([key, label]) => {
              const document = latestDocuments.get(key);
              return <button key={key} type="button" onClick={() => useLatestDocument(key)} className={documentKey === key ? styles.selectedDocument : ""}><span>{label}</span><small>{document ? `${document.version} · ${document.status}` : "ساخته نشده"}</small></button>;
            })}
          </aside>
          <div className={styles.documentEditor}>
            <div className={styles.formGrid}><label><span>کلید سند</span><select value={documentKey} onChange={(event) => useLatestDocument(event.target.value)}>{DOCUMENT_KEYS.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label><span>نسخه جدید</span><input value={documentVersion} onChange={(event) => setDocumentVersion(event.target.value)} /></label></div>
            <label><span>عنوان</span><input value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} /></label>
            <label><span>خلاصه</span><textarea rows={2} value={documentSummary} onChange={(event) => setDocumentSummary(event.target.value)} /></label>
            <label><span>متن کامل</span><textarea className={styles.legalText} rows={24} value={documentBody} onChange={(event) => setDocumentBody(event.target.value)} /></label>
            <div className={styles.actionRow}><button disabled={saving} onClick={() => saveDocument(false)}>ذخیره پیش‌نویس</button><button className={styles.approve} disabled={saving} onClick={() => saveDocument(true)}>انتشار نسخه جدید</button></div>
            <p className={styles.publishNote}>انتشار نسخه جدید، نسخه منتشرشده قبلی همان سند را بایگانی می‌کند. پذیرش کاربران به نسخه و هش متن متصل می‌شود.</p>
          </div>
        </section>
      )}

      {tab === "settings" && settings && (
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><h2>تنظیمات برنامه</h2><p>برنامه تا تکمیل هویت قانونی و انتشار قوانین باز نمی‌شود.</p></div></div>
          <div className={styles.switches}><label><input type="checkbox" checked={settings.program_active} onChange={(event) => setSettings({ ...settings, program_active: event.target.checked })} /><span>برنامه سفیران فعال باشد</span></label><label><input type="checkbox" checked={settings.applications_open} onChange={(event) => setSettings({ ...settings, applications_open: event.target.checked })} /><span>ثبت درخواست‌ها باز باشد</span></label><label><input type="checkbox" checked={settings.seller_confirmation_required} onChange={(event) => setSettings({ ...settings, seller_confirmation_required: event.target.checked })} /><span>تأیید مالک اجباری باشد</span></label><label><input type="checkbox" checked={settings.direct_payment_only} onChange={(event) => setSettings({ ...settings, direct_payment_only: event.target.checked })} /><span>پرداخت فقط مستقیم به چاکود</span></label></div>
          <h3>هویت قانونی و پشتیبانی</h3>
          <div className={styles.formGrid}>
            <label><span>نام قانونی بهره‌بردار</span><input value={settings.legal_identity?.legal_name || ""} onChange={(event) => setSettings({ ...settings, legal_identity: { ...settings.legal_identity, legal_name: event.target.value } })} /></label>
            <label><span>شناسه ملی</span><input value={settings.legal_identity?.national_id || ""} onChange={(event) => setSettings({ ...settings, legal_identity: { ...settings.legal_identity, national_id: event.target.value } })} /></label>
            <label><span>شماره ثبت</span><input value={settings.legal_identity?.registration_no || ""} onChange={(event) => setSettings({ ...settings, legal_identity: { ...settings.legal_identity, registration_no: event.target.value } })} /></label>
            <label><span>شماره پشتیبانی</span><input value={settings.legal_identity?.support_mobile || ""} onChange={(event) => setSettings({ ...settings, legal_identity: { ...settings.legal_identity, support_mobile: event.target.value } })} /></label>
            <label><span>ایمیل پشتیبانی</span><input value={settings.legal_identity?.support_email || ""} onChange={(event) => setSettings({ ...settings, legal_identity: { ...settings.legal_identity, support_email: event.target.value } })} /></label>
            <label className={styles.wide}><span>نشانی قانونی</span><textarea rows={3} value={settings.legal_identity?.legal_address || ""} onChange={(event) => setSettings({ ...settings, legal_identity: { ...settings.legal_identity, legal_address: event.target.value } })} /></label>
          </div>
          <h3>قواعد مالی پایه</h3>
          <div className={styles.formGrid}>
            <label><span>درصد پیش‌فرض</span><input type="number" min="0" max="100" value={settings.default_commission_percent} onChange={(event) => setSettings({ ...settings, default_commission_percent: Number(event.target.value) })} /></label>
            <label><span>حداکثر درصد قابل اعلام</span><input type="number" min="0" max="100" value={settings.max_commission_percent} onChange={(event) => setSettings({ ...settings, max_commission_percent: Number(event.target.value) })} /></label>
            <label><span>دوره انتظار پورسانت</span><input type="number" min="0" max="90" value={settings.commission_hold_days} onChange={(event) => setSettings({ ...settings, commission_hold_days: Number(event.target.value) })} /></label>
            <label><span>حداقل تسویه تومان</span><input type="number" min="0" value={settings.minimum_payout_toman} onChange={(event) => setSettings({ ...settings, minimum_payout_toman: Number(event.target.value) })} /></label>
            <label><span>سقف روزانه سفیر جدید</span><input type="number" min="1" max="100" value={settings.new_ambassador_daily_limit} onChange={(event) => setSettings({ ...settings, new_ambassador_daily_limit: Number(event.target.value) })} /></label>
            <label><span>دوره تسویه</span><select value={settings.payout_cycle} onChange={(event) => setSettings({ ...settings, payout_cycle: event.target.value })}><option value="weekly">هفتگی</option><option value="twice_monthly">دو بار در ماه</option><option value="monthly">ماهانه</option></select></label>
            <label className={styles.wide}><span>عنوان عمومی</span><input value={settings.public_title} onChange={(event) => setSettings({ ...settings, public_title: event.target.value })} /></label>
            <label className={styles.wide}><span>توضیح عمومی</span><textarea rows={3} value={settings.public_description} onChange={(event) => setSettings({ ...settings, public_description: event.target.value })} /></label>
          </div>
          <button className={styles.primaryButton} disabled={saving} onClick={saveSettings}>{saving ? "در حال ذخیره…" : "ذخیره تنظیمات"}</button>
        </section>
      )}
    </main>
  );
}
