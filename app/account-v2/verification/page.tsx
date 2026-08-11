"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./page.module.css";

type DealerOption = { dealer_id: number; dealer_name: string; role?: string };
type CommandResponse = {
  success?: boolean;
  message?: string;
  dealer?: { id: number; name: string };
  dealers?: DealerOption[];
  role?: string;
};

type Verification = {
  id: number;
  activity_name: string;
  applicant_relation: string;
  document_type: string;
  document_reference: string;
  license_holder_name: string;
  document_name: string;
  status: "pending" | "verified" | "rejected" | "suspended" | string;
  rejection_reason?: string;
  reviewed_at?: string | null;
  updated_at?: string;
};

type VerificationResponse = {
  success?: boolean;
  message?: string;
  dealer?: { id: number; name: string; role: string };
  verification?: Verification | null;
};

type PreparedDocument = {
  name: string;
  dataUrl: string;
  bytes: number;
};

const MAX_BYTES = 1_000_000;

function safeReturnTo(value: string | null) {
  if (!value) return "/account";
  if (value === "/account" || value.startsWith("/account/") || value.startsWith("/account?")) return value;
  return "/account";
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("فایل خوانده نشد."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function dataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(",", 2)[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("تصویر مدرک قابل پردازش نیست."));
    image.src = dataUrl;
  });
}

async function prepareDocument(file: File): Promise<PreparedDocument> {
  if (file.type === "application/pdf") {
    if (file.size > MAX_BYTES) throw new Error("PDF باید حداکثر ۱ مگابایت باشد.");
    return { name: file.name || "document.pdf", dataUrl: await readFileAsDataUrl(file), bytes: file.size };
  }

  if (!file.type.startsWith("image/")) throw new Error("فایل باید عکس یا PDF باشد.");

  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("پردازش تصویر در این مرورگر ممکن نیست.");
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.84;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrlBytes(dataUrl) > 920_000 && quality > 0.5) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  const bytes = dataUrlBytes(dataUrl);
  if (bytes > MAX_BYTES) throw new Error("تصویر هنوز بزرگ است؛ لطفاً عکس نزدیک‌تر و ساده‌تری بگیرید.");
  const baseName = (file.name || "business-license").replace(/\.[^.]+$/, "");
  return { name: `${baseName}.jpg`, dataUrl, bytes };
}

function statusTitle(status?: string) {
  if (status === "verified") return "مجموعه تأیید شده";
  if (status === "pending") return "در انتظار بررسی مدیریت";
  if (status === "rejected") return "مدرک نیاز به اصلاح دارد";
  if (status === "suspended") return "تأیید مجموعه متوقف شده";
  return "تأیید مجموعه";
}

export default function BusinessVerificationPage() {
  const searchParams = useSearchParams();
  const requestedDealerIdRaw = Math.round(Number(searchParams.get("dealer_id") || 0));
  const requestedDealerId = Number.isSafeInteger(requestedDealerIdRaw) && requestedDealerIdRaw > 0 ? requestedDealerIdRaw : 0;
  const returnTo = safeReturnTo(searchParams.get("return_to"));

  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [dealerId, setDealerId] = useState(0);
  const [dealerRole, setDealerRole] = useState("");
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [document, setDocument] = useState<PreparedDocument | null>(null);
  const [form, setForm] = useState({
    applicant_relation: "owner",
    document_type: "business_license",
    document_reference: "",
    license_holder_name: "",
  });

  async function loadStatus(targetId: number) {
    if (!targetId) return;
    const response = await fetch(`/api/auth/business-verification?dealer_id=${targetId}`, {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const result = (await response.json().catch(() => null)) as VerificationResponse | null;
    if (!response.ok || !result?.success) throw new Error(result?.message || "وضعیت تأیید دریافت نشد.");
    setDealerRole(result.dealer?.role || "");
    setVerification(result.verification || null);
    if (result.dealer?.role === "manager") setForm((current) => ({ ...current, applicant_relation: "manager" }));
  }

  async function loadCenter(targetId?: number) {
    const query = targetId ? `?dealer_id=${targetId}` : "";
    const response = await fetch(`/api/auth/dealer-command-center${query}`, {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const result = (await response.json().catch(() => null)) as CommandResponse | null;
    if (!response.ok || !result?.success || !result.dealer) throw new Error(result?.message || "نمایشگاهی برای تأیید پیدا نشد.");

    const options = Array.isArray(result.dealers) && result.dealers.length
      ? result.dealers
      : [{ dealer_id: result.dealer.id, dealer_name: result.dealer.name, role: result.role }];
    setDealers(options);
    const nextId = targetId || result.dealer.id;
    setDealerId(nextId);
    setDealerRole(result.role || options.find((item) => item.dealer_id === nextId)?.role || "");
    await loadStatus(nextId);
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        await loadCenter(requestedDealerId || undefined);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "دریافت اطلاعات انجام نشد.");
      } finally {
        setLoading(false);
      }
    })();
  }, [requestedDealerId]);

  const canSubmit = useMemo(() => {
    return dealerId > 0 && Boolean(document) && form.license_holder_name.trim().length >= 2 && !saving && !preparing;
  }, [dealerId, document, form.license_holder_name, saving, preparing]);

  async function changeDealer(nextId: number) {
    setDealerId(nextId);
    setVerification(null);
    setDocument(null);
    setNotice("");
    setError("");
    setLoading(true);
    try {
      await loadCenter(nextId);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "تغییر مجموعه انجام نشد.");
    } finally {
      setLoading(false);
    }
  }

  async function selectDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreparing(true);
    setError("");
    setNotice("");
    try {
      const prepared = await prepareDocument(file);
      setDocument(prepared);
    } catch (fileError) {
      setDocument(null);
      setError(fileError instanceof Error ? fileError.message : "فایل مدرک آماده نشد.");
    } finally {
      setPreparing(false);
      event.target.value = "";
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !document) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/business-verification", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          dealer_id: dealerId,
          ...form,
          document_name: document.name,
          document_data_url: document.dataUrl,
        }),
      });
      const result = (await response.json().catch(() => null)) as VerificationResponse | null;
      if (!response.ok || !result?.success || !result.verification) throw new Error(result?.message || "ارسال مدرک انجام نشد.");
      setVerification(result.verification);
      setDocument(null);
      setNotice(result.message || "پرونده برای بررسی ارسال شد.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "ارسال مدرک انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  const locked = verification?.status === "pending" || verification?.status === "verified" || verification?.status === "suspended";

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href={returnTo}>بازگشت</Link>
          <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
        </header>

        <section className={styles.hero}>
          <span>احراز مجموعه</span>
          <h1>{statusTitle(verification?.status)}</h1>
          <p>برای فعال شدن مدیریت تیم، مالک یا مدیر مجاز باید مدرک فعالیت معتبر ارسال کند و تأیید مدیریت چاکود را دریافت کند.</p>
        </section>

        {error ? <div className={styles.error}>{error}</div> : null}
        {notice ? <div className={styles.success}>{notice}</div> : null}

        {!loading && dealers.length > 1 ? (
          <label className={styles.selector}>
            <span>مجموعه</span>
            <select value={dealerId} onChange={(event) => void changeDealer(Number(event.target.value))}>
              {dealers.map((dealer) => <option key={dealer.dealer_id} value={dealer.dealer_id}>{dealer.dealer_name}</option>)}
            </select>
          </label>
        ) : null}

        {loading ? <div className={styles.state}>در حال دریافت وضعیت مجموعه…</div> : null}

        {!loading && dealerId > 0 ? (
          <>
            <section className={styles.statusCard} data-status={verification?.status || "unverified"}>
              <div>
                <small>وضعیت فعلی</small>
                <strong>{statusTitle(verification?.status)}</strong>
                <span>نقش شما: {dealerRole === "owner" ? "مالک" : dealerRole === "manager" ? "مدیر" : dealerRole || "—"}</span>
              </div>
              {verification?.document_name ? <b>{verification.document_name}</b> : <b>مدرکی ثبت نشده</b>}
            </section>

            {verification?.status === "rejected" && verification.rejection_reason ? (
              <div className={styles.rejectReason}><strong>دلیل رد:</strong> {verification.rejection_reason}</div>
            ) : null}

            {!locked ? (
              <form className={styles.form} onSubmit={submit}>
                <div className={styles.twoCols}>
                  <label>
                    <span>نسبت شما با مجموعه</span>
                    <select value={form.applicant_relation} onChange={(event) => setForm({ ...form, applicant_relation: event.target.value })}>
                      <option value="owner">مالک</option>
                      <option value="manager">مدیر</option>
                      <option value="authorized_representative">نماینده مجاز</option>
                    </select>
                  </label>
                  <label>
                    <span>نوع مدرک</span>
                    <select value={form.document_type} onChange={(event) => setForm({ ...form, document_type: event.target.value })}>
                      <option value="business_license">پروانه کسب</option>
                      <option value="activity_license">جواز فعالیت</option>
                      <option value="registration_document">مدرک ثبتی</option>
                      <option value="other">مدرک معتبر دیگر</option>
                    </select>
                  </label>
                </div>

                <label>
                  <span>نام صاحب مجوز</span>
                  <input value={form.license_holder_name} onChange={(event) => setForm({ ...form, license_holder_name: event.target.value })} placeholder="مطابق مدرک" maxLength={160} autoComplete="name" />
                </label>

                <label>
                  <span>شماره پروانه / شناسه مدرک <em>اختیاری</em></span>
                  <input value={form.document_reference} onChange={(event) => setForm({ ...form, document_reference: event.target.value })} placeholder="در صورت وجود" maxLength={100} inputMode="numeric" />
                </label>

                <label className={styles.uploadBox}>
                  <input type="file" accept="image/jpeg,image/png,application/pdf" capture="environment" onChange={(event) => void selectDocument(event)} />
                  <strong>{preparing ? "در حال آماده‌سازی تصویر…" : document ? "مدرک آماده ارسال است" : "عکس یا فایل مدرک را انتخاب کنید"}</strong>
                  <small>{document ? `${document.name} · ${(document.bytes / 1024).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} کیلوبایت` : "JPG، PNG یا PDF · حداکثر ۱ مگابایت بعد از آماده‌سازی"}</small>
                </label>

                <div className={styles.privacy}>فایل مدرک عمومی نمی‌شود و فقط برای بررسی مدیریتی چاکود قابل دسترسی است.</div>
                <button type="submit" disabled={!canSubmit}>{saving ? "در حال ارسال…" : verification?.status === "rejected" ? "ارسال مدرک اصلاح‌شده" : "ارسال برای تأیید"}</button>
              </form>
            ) : null}

            {verification?.status === "pending" ? <div className={styles.info}>مدرک ثبت شده است. بعد از بررسی مدیریت چاکود، امکان افزودن پرسنل فعال می‌شود.</div> : null}
            {verification?.status === "verified" ? (
              <div className={styles.verified}>
                <span>مدیریت این مجموعه تأیید شده و افزودن پرسنل فعال است.</span>
                <Link href={returnTo}>بازگشت و افزودن پرسنل</Link>
              </div>
            ) : null}
            {verification?.status === "suspended" ? <div className={styles.info}>برای ادامه فرایند با پشتیبانی چاکود تماس بگیرید.</div> : null}
          </>
        ) : null}

        <div className={styles.bottomSpace} />
      </div>
      <MobileBottomNav />
    </main>
  );
}
