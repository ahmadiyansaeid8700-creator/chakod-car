"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type VerificationRequest = {
  id: number;
  activity_type: string;
  activity_external_id: number;
  activity_name: string;
  applicant_user_id: number;
  applicant_mobile: string;
  applicant_relation: string;
  document_type: string;
  document_reference: string;
  license_holder_name: string;
  document_name: string;
  document_mime: string;
  status: string;
  rejection_reason: string;
  reviewed_by: string;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
};

type ResponseShape = {
  success?: boolean;
  message?: string;
  requests?: VerificationRequest[];
  verification?: VerificationRequest;
};

function statusLabel(status: string) {
  if (status === "pending") return "در انتظار بررسی";
  if (status === "verified") return "تأییدشده";
  if (status === "rejected") return "ردشده";
  if (status === "suspended") return "متوقف";
  return status;
}

function relationLabel(value: string) {
  if (value === "owner") return "مالک";
  if (value === "manager") return "مدیر";
  if (value === "authorized_representative") return "نماینده مجاز";
  return value;
}

function documentLabel(value: string) {
  if (value === "business_license") return "پروانه کسب";
  if (value === "activity_license") return "جواز فعالیت";
  if (value === "registration_document") return "مدرک ثبتی";
  return "مدرک دیگر";
}

export default function BusinessVerificationsAdminPage() {
  const [items, setItems] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState("pending");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/business-verifications", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const result = (await response.json().catch(() => null)) as ResponseShape | null;
      if (!response.ok || !result?.success || !Array.isArray(result.requests)) throw new Error(result?.message || "پرونده‌ها دریافت نشدند.");
      setItems(result.requests);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "دریافت پرونده‌ها انجام نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function review(id: number, action: "approve" | "reject" | "suspend") {
    if (workingId) return;
    setWorkingId(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/business-verifications", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, rejection_reason: reasons[id] || "" }),
      });
      const result = (await response.json().catch(() => null)) as ResponseShape | null;
      if (!response.ok || !result?.success || !result.verification) throw new Error(result?.message || "عملیات بررسی انجام نشد.");
      setItems((current) => current.map((item) => item.id === id ? result.verification! : item));
      setNotice(result.message || "وضعیت پرونده ذخیره شد.");
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "عملیات بررسی انجام نشد.");
    } finally {
      setWorkingId(0);
    }
  }

  const visibleItems = useMemo(() => filter === "all" ? items : items.filter((item) => item.status === filter), [filter, items]);
  const pendingCount = items.filter((item) => item.status === "pending").length;

  return (
    <main className={styles.page} dir="rtl">
      <header className={styles.hero}>
        <div>
          <span>مدیریت کسب‌وکارها</span>
          <h1>تأیید مدارک مجموعه‌ها</h1>
          <p>مدرک مالک یا مدیر اصلی را بررسی کنید؛ فایل‌ها عمومی نیستند.</p>
        </div>
        <b>{pendingCount.toLocaleString("fa-IR")} در انتظار</b>
      </header>

      {error ? <div className={styles.error}>{error}</div> : null}
      {notice ? <div className={styles.notice}>{notice}</div> : null}

      <div className={styles.filters}>
        {[["pending", "در انتظار"], ["verified", "تأییدشده"], ["rejected", "ردشده"], ["suspended", "متوقف"], ["all", "همه"]].map(([value, label]) => (
          <button key={value} type="button" data-active={filter === value} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>

      {loading ? <div className={styles.state}>در حال دریافت پرونده‌ها…</div> : null}
      {!loading && visibleItems.length === 0 ? <div className={styles.state}>پرونده‌ای در این وضعیت وجود ندارد.</div> : null}

      <section className={styles.grid}>
        {visibleItems.map((item) => (
          <article className={styles.card} key={item.id}>
            <header>
              <div>
                <span>{item.activity_type === "dealer" ? "نمایشگاه خودرو" : item.activity_type}</span>
                <h2>{item.activity_name}</h2>
                <small>شناسه مجموعه: {item.activity_external_id.toLocaleString("fa-IR")}</small>
              </div>
              <b data-status={item.status}>{statusLabel(item.status)}</b>
            </header>

            <dl>
              <div><dt>درخواست‌کننده</dt><dd>{relationLabel(item.applicant_relation)} · <span dir="ltr">{item.applicant_mobile || `User ${item.applicant_user_id}`}</span></dd></div>
              <div><dt>صاحب مجوز</dt><dd>{item.license_holder_name}</dd></div>
              <div><dt>نوع مدرک</dt><dd>{documentLabel(item.document_type)}</dd></div>
              <div><dt>شماره مدرک</dt><dd>{item.document_reference || "ثبت نشده"}</dd></div>
            </dl>

            <a className={styles.documentLink} href={`/api/admin/business-verifications/${item.id}/document`} target="_blank" rel="noreferrer">مشاهده مدرک · {item.document_name}</a>

            {item.rejection_reason ? <div className={styles.rejectedText}>دلیل رد: {item.rejection_reason}</div> : null}

            {item.status === "pending" || item.status === "rejected" ? (
              <label className={styles.reasonField}>
                <span>دلیل رد در صورت نیاز</span>
                <textarea value={reasons[item.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="مثلاً تصویر ناخواناست یا نام صاحب مجوز با درخواست تطابق ندارد." maxLength={500} />
              </label>
            ) : null}

            <div className={styles.actions}>
              <button type="button" className={styles.approve} disabled={workingId === item.id || item.status === "verified"} onClick={() => void review(item.id, "approve")}>تأیید</button>
              <button type="button" className={styles.reject} disabled={workingId === item.id} onClick={() => void review(item.id, "reject")}>رد با دلیل</button>
              <button type="button" disabled={workingId === item.id || item.status === "suspended"} onClick={() => void review(item.id, "suspend")}>توقف</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
