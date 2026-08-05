"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./AffiliateAdminClient.module.css";

type Settings = {
  program_active: boolean;
  registrations_open: boolean;
  public_title: string;
  public_description: string;
  attribution_days: number;
  customer_discount_percent: number;
  bonus_commission_percent: number;
  regular_commission_percent: number;
  bonus_qualified_sales_count: number;
  commission_hold_days: number;
  minimum_payout_toman: number;
  period_close_day: number;
  payout_day: number;
  qualified_services: string[];
  legal_identity: Record<string, string>;
};

type Doc = {
  id: number;
  document_key: string;
  version: string;
  title: string;
  summary?: string;
  body_text: string;
  status: string;
  published_at?: string;
};

type Account = {
  id: number;
  affiliate_code: string;
  status: string;
  full_name?: string;
  mobile: string;
  province?: string;
  city?: string;
  kyc_status: string;
  iban?: string;
  iban_owner_name?: string;
  payout_block_reason?: string;
  clicks: number;
  qualified_sales: number;
  available_amount: number;
};

type Commission = {
  id: number;
  affiliate_code: string;
  full_name?: string;
  mobile: string;
  order_id: number;
  order_no?: string;
  service_key: string;
  net_collected_toman: number;
  commission_percent: number;
  commission_amount_toman: number;
  status: string;
  created_at: string;
};

type Payout = {
  id: number;
  affiliate_code: string;
  full_name?: string;
  mobile: string;
  period_key: string;
  amount_toman: number;
  scheduled_pay_at: string;
  status: string;
  reference_no?: string;
};

type Capabilities = {
  can_manage_users: boolean;
  can_manage_finance: boolean;
  can_manage_settings: boolean;
  can_manage_documents: boolean;
  can_view_sensitive_finance: boolean;
};

type Payload = {
  success: boolean;
  message?: string;
  settings?: Settings;
  readiness?: { ready: boolean; open: boolean; missing: string[] };
  documents?: Doc[];
  accounts?: Account[];
  commissions?: Commission[];
  payouts?: Payout[];
  stats?: Record<string, number>;
  capabilities?: Capabilities;
};

type Tab = "overview" | "settings" | "documents" | "accounts" | "commissions" | "payouts";

const docMeta = [
  ["affiliate_agreement", "قرارداد همکاری در فروش"],
  ["affiliate_privacy", "حریم خصوصی"],
  ["affiliate_promotion_rules", "ضوابط تبلیغ"],
] as const;

const labels: Record<string, string> = {
  active_tracking: "فعال",
  active: "فعال",
  suspended: "تعلیق",
  terminated: "خاتمه",
  not_submitted: "ثبت نشده",
  pending_review: "در انتظار بررسی",
  verified: "تأیید شده",
  rejected: "رد شده",
  awaiting_payment: "در انتظار پرداخت",
  hold: "معلق",
  available: "قابل تسویه",
  scheduled: "در صف پرداخت",
  paid: "پرداخت‌شده",
  reversed: "لغوشده",
};

const EMPTY_CAPABILITIES: Capabilities = {
  can_manage_users: false,
  can_manage_finance: false,
  can_manage_settings: false,
  can_manage_documents: false,
  can_view_sensitive_finance: false,
};

const ADMIN_CACHE_KEY = "chakod_affiliate_admin_base_v3";

function fa(value: number) {
  return Number(value || 0).toLocaleString("fa-IR");
}

function tokenHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("chakod_session_token") || "";
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

async function encodeLegalBody(value: string): Promise<Record<string, string>> {
  const text = value.trim();
  if (text.length < 4000 || typeof CompressionStream === "undefined") {
    return { body_text: text, body_text_encoding: "plain" };
  }
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return { body_text_data: bytesToBase64(bytes), body_text_encoding: "gzip-base64" };
}

function nextVersion(value?: string) {
  const match = String(value || "").match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? `${match[1]}.${Number(match[2]) + 1}.0` : "1.0.0";
}

function currentPersian() {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year")?.value || 1405),
    month: Number(parts.find((part) => part.type === "month")?.value || 1),
  };
}

export default function AffiliateAdminClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<Payload | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const settingsDirtyRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loadedSections, setLoadedSections] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [docKey, setDocKey] = useState("affiliate_agreement");
  const [docVersion, setDocVersion] = useState("1.0.0");
  const [docTitle, setDocTitle] = useState("");
  const [docSummary, setDocSummary] = useState("");
  const [docBody, setDocBody] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [accountStatus, setAccountStatus] = useState("all");
  const persian = currentPersian();
  const [periodYear, setPeriodYear] = useState(persian.year);
  const [periodMonth, setPeriodMonth] = useState(persian.month);
  const [references, setReferences] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});

  const capabilities = data?.capabilities || EMPTY_CAPABILITIES;

  async function loadSection(section = "base", background = false) {
    if (!background) setLoading(true);
    else setRefreshing(true);
    if (!background) setError("");

    try {
      const response = await fetch(`/api/admin/affiliate?section=${encodeURIComponent(section)}`, {
        cache: "no-store",
        headers: tokenHeaders(),
      });
      const raw = await response.text();
      let payload: Payload;
      try {
        payload = JSON.parse(raw) as Payload;
      } catch {
        throw new Error(`پاسخ نامعتبر از سرور دریافت شد (${response.status}).`);
      }
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "دریافت اطلاعات انجام نشد.");
      }

      setData((current) => {
        const merged: Payload = {
          ...(current || { success: true }),
          ...payload,
          settings: payload.settings ?? current?.settings,
          readiness: payload.readiness ?? current?.readiness,
          documents: payload.documents ?? current?.documents,
          accounts: payload.accounts ?? current?.accounts,
          commissions: payload.commissions ?? current?.commissions,
          payouts: payload.payouts ?? current?.payouts,
          stats: payload.stats ?? current?.stats,
          capabilities: payload.capabilities ?? current?.capabilities,
        };
        if (section === "base" && typeof window !== "undefined") {
          try {
            sessionStorage.setItem(
              ADMIN_CACHE_KEY,
              JSON.stringify({
                settings: merged.settings,
                readiness: merged.readiness,
                stats: merged.stats || {},
                capabilities: merged.capabilities,
                savedAt: Date.now(),
              }),
            );
          } catch {}
        }
        return merged;
      });

      if (payload.settings && !settingsDirtyRef.current) setSettings(payload.settings);
      setLoadedSections((current) => ({ ...current, [section]: true }));
      if (section === "base") setError("");
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "ارتباط برقرار نشد.";
      if (!background || !data) setError(text);
    } finally {
      if (!background) setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let hadCache = false;
    try {
      const cached = sessionStorage.getItem(ADMIN_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          settings?: Settings;
          readiness?: Payload["readiness"];
          stats?: Record<string, number>;
          capabilities?: Capabilities;
        };
        if (parsed.settings) {
          setData({
            success: true,
            settings: parsed.settings,
            readiness: parsed.readiness,
            stats: parsed.stats || {},
            capabilities: parsed.capabilities,
          });
          setSettings(parsed.settings);
          setLoading(false);
          hadCache = true;
        }
      }
    } catch {}
    void loadSection("base", hadCache).then(() => void loadSection("stats", true));
  }, []);

  useEffect(() => {
    const section =
      tab === "documents"
        ? "documents"
        : tab === "accounts"
          ? "accounts"
          : tab === "commissions"
            ? "commissions"
            : tab === "payouts"
              ? "payouts"
              : "base";
    if (section !== "base" && !loadedSections[section]) void loadSection(section, true);
  }, [tab, loadedSections]);

  useEffect(() => {
    if (tab === "documents" && data?.documents?.length) selectDoc(docKey);
  }, [tab, data?.documents]);

  async function mutate(body: Record<string, unknown>) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch("/api/admin/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeaders() },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const raw = await response.text();
      let payload: Payload;
      try {
        payload = JSON.parse(raw) as Payload;
      } catch {
        throw new Error(`پاسخ نامعتبر از سرور دریافت شد (${response.status}).`);
      }
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "عملیات انجام نشد.");
      }
      return payload;
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        throw new Error("زمان پاسخ سرور تمام شد. دوباره تلاش کنید.");
      }
      throw caught;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function run(body: Record<string, unknown>, actionName = "operation") {
    setBusyAction(actionName);
    setError("");
    setMessage("");
    try {
      const payload = await mutate(body);
      setMessage(payload.message || "عملیات با موفقیت انجام شد.");
      const action = String(body.action || "");
      const section =
        action === "update_settings"
          ? "base"
          : action === "set_account_status" || action === "review_kyc"
            ? "accounts"
            : action === "generate_monthly_payouts" || action === "mark_payout_paid"
              ? "payouts"
              : tab === "commissions"
                ? "commissions"
                : tab === "accounts"
                  ? "accounts"
                  : tab === "payouts"
                    ? "payouts"
                    : "base";
      await loadSection(section, true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "عملیات انجام نشد.");
    } finally {
      setBusyAction("");
      window.setTimeout(
        () => document.getElementById("affiliate-action-feedback")?.scrollIntoView({ behavior: "smooth", block: "center" }),
        50,
      );
    }
  }

  const latest = useMemo(() => {
    const map = new Map<string, Doc>();
    for (const document of data?.documents || []) {
      if (!map.has(document.document_key)) map.set(document.document_key, document);
    }
    return map;
  }, [data]);

  const filteredAccounts = useMemo(() => {
    const query = accountQuery.trim().toLowerCase();
    return (data?.accounts || []).filter((account) => {
      const matchesStatus = accountStatus === "all" || account.status === accountStatus;
      const haystack = [account.full_name, account.mobile, account.affiliate_code, account.province, account.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!query || haystack.includes(query));
    });
  }, [data?.accounts, accountQuery, accountStatus]);

  function selectDoc(key: string) {
    setDocKey(key);
    const document = latest.get(key);
    const metadata = docMeta.find((item) => item[0] === key);
    setDocVersion(nextVersion(document?.version));
    setDocTitle(document?.title || metadata?.[1] || "");
    setDocSummary(document?.summary || "");
    setDocBody(document?.body_text || "");
  }

  function changeSettings(next: Settings) {
    if (!capabilities.can_manage_settings) return;
    settingsDirtyRef.current = true;
    setSettingsDirty(true);
    setSettings(next);
  }

  async function saveSettings() {
    if (!settings || !capabilities.can_manage_settings) return;
    const legalName = String(settings.legal_identity?.legal_name || "").trim();
    const supportMobile = String(settings.legal_identity?.support_mobile || "").trim();
    const legalAddress = String(settings.legal_identity?.legal_address || "").trim();
    if (!legalName || !supportMobile || !legalAddress) {
      setError("نام قانونی بهره‌بردار، شماره پشتیبانی و نشانی قانونی را کامل کنید.");
      setMessage("");
      return;
    }

    setBusyAction("settings");
    setError("");
    setMessage("");
    try {
      const payload = await mutate({
        action: "update_settings",
        ...settings,
        legal_identity: {
          ...settings.legal_identity,
          legal_name: legalName,
          support_mobile: supportMobile,
          legal_address: legalAddress,
        },
        legal_name: legalName,
        support_mobile: supportMobile,
        legal_address: legalAddress,
      });
      const saved = payload.settings || settings;
      settingsDirtyRef.current = false;
      setSettingsDirty(false);
      setSettings(saved);
      setData((current) => ({
        ...((current || { success: true }) as Payload),
        settings: saved,
        readiness: payload.readiness ?? current?.readiness,
      }));
      setMessage(payload.message || "تنظیمات همکاری در فروش ذخیره شد.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ذخیره تنظیمات انجام نشد.");
    } finally {
      setBusyAction("");
    }
  }

  async function saveDoc(publish: boolean) {
    if (!capabilities.can_manage_documents) return;
    if (!docVersion.trim()) {
      setError("نسخه سند را وارد کنید.");
      return;
    }
    if (!docTitle.trim()) {
      setError("عنوان سند را وارد کنید.");
      return;
    }
    if (docBody.trim().length < 100) {
      setError("متن کامل سند باید حداقل ۱۰۰ نویسه باشد.");
      return;
    }
    setBusyAction(publish ? "publish-document" : "save-document");
    setError("");
    setMessage("");
    try {
      const encoded = await encodeLegalBody(docBody);
      const payload = await mutate({
        action: "save_document",
        document_key: docKey,
        version: docVersion.trim(),
        title: docTitle.trim(),
        summary: docSummary.trim(),
        ...encoded,
        publish,
      });
      setMessage(payload.message || "سند ذخیره شد.");
      const saved = (payload as Payload & { document?: Doc }).document;
      if (saved) {
        setData((current) =>
          current
            ? {
                ...current,
                documents: [
                  saved,
                  ...(current.documents || []).filter(
                    (item) => !(item.document_key === saved.document_key && item.version === saved.version),
                  ),
                ],
              }
            : current,
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "عملیات انجام نشد.");
    } finally {
      setBusyAction("");
    }
  }

  function updateAccountStatus(account: Account, status: "active_tracking" | "suspended" | "terminated") {
    if (!capabilities.can_manage_users) return;
    let reason = "";
    if (status === "suspended") {
      reason = window.prompt("دلیل تعلیق حساب را وارد کنید:", "بررسی مدیریتی")?.trim() || "";
      if (reason.length < 5) return;
    } else if (status === "terminated") {
      if (!window.confirm(`همکاری ${account.full_name || account.mobile} خاتمه پیدا کند؟`)) return;
      reason = window.prompt("دلیل خاتمه همکاری را وارد کنید:")?.trim() || "";
      if (reason.length < 5) return;
    } else {
      reason = "رفع محدودیت توسط مدیر";
    }
    void run({ action: "set_account_status", affiliate_id: account.id, status, reason }, `account-${account.id}`);
  }

  function reviewKyc(account: Account, decision: "verified" | "rejected" | "pending_review") {
    if (!capabilities.can_manage_users) return;
    let note = "";
    if (decision === "rejected") {
      note = window.prompt("دلیل رد اطلاعات تسویه را وارد کنید:")?.trim() || "";
      if (note.length < 5) return;
    }
    if (decision === "pending_review") note = "نیازمند بررسی مجدد";
    void run({ action: "review_kyc", affiliate_id: account.id, decision, note }, `kyc-${account.id}`);
  }

  if (loading && !data) {
    return <main className={styles.page}><div className={styles.loading}>در حال دریافت مدیریت همکاری در فروش…</div></main>;
  }

  if (!data) {
    return (
      <main className={styles.page}>
        <div className={styles.error}>{error || "دریافت اطلاعات انجام نشد."}</div>
        <button onClick={() => void loadSection("base")}>تلاش دوباره</button>
        <p>تا زمان بارگذاری موفق، فرم قوانین و تنظیمات نمایش داده نمی‌شود تا اطلاعات خالی روی نسخه‌های موجود ذخیره نشود.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>مدیریت چاکود</span>
          <h1>همکاری در فروش</h1>
          <p>مدیریت همکاران، قوانین، گزارش پورسانت و تسویه سیستمی</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/admin"))}>بازگشت</button>
          <Link href="/admin">صفحه مدیریت</Link>
          <Link href="/admin/commerce">مدیریت مالی</Link>
          <Link href="/affiliate">صفحه عمومی</Link>
        </div>
      </header>

      <nav className={styles.tabs}>
        {([
          ["overview", "نمای کلی"],
          ["accounts", "مدیریت همکاران"],
          ["commissions", "پورسانت‌ها"],
          ["payouts", "تسویه‌ها"],
          ["settings", "تنظیمات"],
          ["documents", "قوانین"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button className={tab === key ? styles.active : ""} key={key} onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>

      <div id="affiliate-action-feedback">
        {error ? <div className={styles.error}>{error}<button onClick={() => void loadSection("base", true)}>تلاش دوباره</button></div> : null}
        {message ? <div className={styles.success}>{message}</div> : null}
        {refreshing ? <div className={styles.loading}>در حال به‌روزرسانی اطلاعات…</div> : null}
      </div>

      {tab === "overview" ? (
        <>
          <section className={styles.stats}>
            {[
              ["همکاران فعال", data?.stats?.accounts_active],
              ["کل کلیک‌ها", data?.stats?.clicks_total],
              ["فروش واجد شرایط", data?.stats?.qualified_sales],
              ["قابل تسویه", data?.stats?.available_amount],
              ["در صف پرداخت", data?.stats?.scheduled_amount],
              ["پرداخت‌شده", data?.stats?.paid_amount],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <span>{label}</span>
                <strong>{fa(Number(value || 0))}{String(label).includes("تسویه") || String(label).includes("پرداخت") ? " تومان" : ""}</strong>
              </div>
            ))}
          </section>
          <section className={styles.card}>
            <h2>سطح دسترسی این مدیر</h2>
            <div className={styles.permissionGrid}>
              <span>{capabilities.can_manage_users ? "مدیریت کاربران افیلیت: فعال" : "مدیریت کاربران افیلیت: فقط مشاهده"}</span>
              <span>{capabilities.can_manage_finance ? "اجرای تسویه: فعال" : "اجرای تسویه: غیرفعال"}</span>
              <span>{capabilities.can_manage_settings ? "تغییر نرخ‌ها و تنظیمات: فعال" : "تغییر نرخ‌ها و تنظیمات: فقط مالک یا مدیر ارشد"}</span>
              <span>{capabilities.can_manage_documents ? "مدیریت قوانین: فعال" : "مدیریت قوانین: فقط مشاهده"}</span>
            </div>
            <div className={styles.lockNotice}>مبلغ پورسانت، موجودی، تعداد فروش و مبلغ تسویه از تراکنش‌های واقعی محاسبه می‌شوند و هیچ مدیر عادی امکان کم یا زیادکردن دستی آن‌ها را ندارد.</div>
          </section>
          <section className={styles.card}>
            <h2>آمادگی برنامه</h2>
            <div className={data?.readiness?.ready ? styles.ready : styles.notReady}>{data?.readiness?.ready ? "زیرساخت حقوقی آماده است." : "موارد لازم تکمیل نشده است."}</div>
            {data?.readiness?.missing?.length ? <ul>{data.readiness.missing.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          </section>
        </>
      ) : null}

      {tab === "accounts" ? (
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <h2>مدیریت همکاران فروش</h2>
              <p>فعال‌سازی، تعلیق، خاتمه همکاری و بررسی اطلاعات تسویه از این بخش انجام می‌شود.</p>
            </div>
            <span className={styles.readOnlyBadge}>مبالغ فقط خواندنی</span>
          </div>
          <div className={styles.accountToolbar}>
            <input placeholder="جست‌وجو با نام، موبایل یا کد همکاری" value={accountQuery} onChange={(event) => setAccountQuery(event.target.value)} />
            <select value={accountStatus} onChange={(event) => setAccountStatus(event.target.value)}>
              <option value="all">همه وضعیت‌ها</option>
              <option value="active_tracking">فعال</option>
              <option value="suspended">تعلیق</option>
              <option value="terminated">خاتمه‌یافته</option>
            </select>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>همکار</th><th>کد و وضعیت</th><th>عملکرد</th><th>موجودی سیستمی</th><th>احراز و شبا</th><th>عملیات مدیریتی</th></tr></thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr key={account.id}>
                    <td><b>{account.full_name || "—"}</b><small>{account.mobile}<br />{account.province || ""} {account.city || ""}</small></td>
                    <td><code>{account.affiliate_code}</code><small>{labels[account.status] || account.status}</small></td>
                    <td>{fa(account.clicks)} کلیک<small>{fa(account.qualified_sales)} فروش واجد شرایط</small></td>
                    <td><b>{fa(account.available_amount)} تومان</b><small>محاسبه خودکار؛ غیرقابل ویرایش</small></td>
                    <td>{labels[account.kyc_status] || account.kyc_status}<small>{account.iban || "بدون شبا"}</small>{account.payout_block_reason ? <small>{account.payout_block_reason}</small> : null}</td>
                    <td>
                      {capabilities.can_manage_users ? (
                        <div className={styles.rowActions}>
                          <button disabled={Boolean(busyAction)} onClick={() => reviewKyc(account, "verified")}>تأیید شبا</button>
                          <button disabled={Boolean(busyAction)} onClick={() => reviewKyc(account, "rejected")}>رد شبا</button>
                          {account.status === "suspended" ? (
                            <button disabled={Boolean(busyAction)} onClick={() => updateAccountStatus(account, "active_tracking")}>فعال‌سازی</button>
                          ) : (
                            <button disabled={Boolean(busyAction)} className={styles.warningButton} onClick={() => updateAccountStatus(account, "suspended")}>تعلیق</button>
                          )}
                          {account.status !== "terminated" ? <button disabled={Boolean(busyAction)} className={styles.danger} onClick={() => updateAccountStatus(account, "terminated")}>خاتمه</button> : null}
                        </div>
                      ) : <span>فقط مشاهده</span>}
                    </td>
                  </tr>
                ))}
                {filteredAccounts.length === 0 ? <tr><td colSpan={6} className={styles.empty}>همکاری با این مشخصات پیدا نشد.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "commissions" ? (
        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h2>پورسانت‌ها</h2><p>تمام نرخ‌ها و مبالغ از سفارش پرداخت‌شده محاسبه و قفل می‌شوند.</p></div><span className={styles.readOnlyBadge}>بدون ویرایش دستی</span></div>
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>همکار</th><th>سفارش</th><th>پرداخت مشتری</th><th>نرخ قفل‌شده</th><th>پورسانت</th><th>وضعیت</th></tr></thead>
              <tbody>{(data?.commissions || []).map((commission) => <tr key={commission.id}><td>{commission.full_name || commission.affiliate_code}<small>{commission.mobile}</small></td><td>{commission.order_no || `#${commission.order_id}`}</td><td>{fa(commission.net_collected_toman)} تومان</td><td>{fa(commission.commission_percent)}٪</td><td>{fa(commission.commission_amount_toman)} تومان</td><td>{labels[commission.status] || commission.status}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "payouts" ? (
        <>
          <section className={styles.card}>
            <div className={styles.sectionHead}><div><h2>ساخت دوره تسویه ماهانه</h2><p>مبلغ هر تسویه از پورسانت‌های قطعی و تخصیص‌نیافته محاسبه می‌شود و قابل تایپ یا تغییر نیست.</p></div><span className={styles.readOnlyBadge}>مبلغ سیستمی</span></div>
            {capabilities.can_manage_finance ? (
              <div className={styles.inlineForm}>
                <label><span>سال شمسی</span><input type="number" value={periodYear} onChange={(event) => setPeriodYear(Number(event.target.value))} /></label>
                <label><span>ماه شمسی</span><input type="number" min="1" max="12" value={periodMonth} onChange={(event) => setPeriodMonth(Number(event.target.value))} /></label>
                <button disabled={Boolean(busyAction)} onClick={() => run({ action: "generate_monthly_payouts", jalali_year: periodYear, jalali_month: periodMonth }, "generate-payouts")}>{busyAction === "generate-payouts" ? "در حال ساخت…" : "ساخت دوره"}</button>
              </div>
            ) : <div className={styles.lockNotice}>این مدیر اجازه ساخت دوره یا ثبت پرداخت را ندارد.</div>}
          </section>
          <section className={styles.card}>
            <h2>فهرست تسویه‌ها</h2>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>همکار</th><th>دوره</th><th>مبلغ قفل‌شده</th><th>زمان پرداخت</th><th>وضعیت</th><th>ثبت پرداخت</th></tr></thead>
                <tbody>{(data?.payouts || []).map((payout) => <tr key={payout.id}><td>{payout.full_name || payout.affiliate_code}<small>{payout.mobile}</small></td><td>{payout.period_key}</td><td>{fa(payout.amount_toman)} تومان<small>غیرقابل ویرایش</small></td><td>{payout.scheduled_pay_at}</td><td>{labels[payout.status] || payout.status}</td><td>{payout.status === "scheduled" && capabilities.can_manage_finance ? <div className={styles.payForm}><input placeholder="کد پیگیری" value={references[payout.id] || ""} onChange={(event) => setReferences({ ...references, [payout.id]: event.target.value })} /><button onClick={() => run({ action: "mark_payout_paid", payout_id: payout.id, reference_no: references[payout.id] || "", admin_note: notes[payout.id] || "" })}>پرداخت شد</button></div> : payout.reference_no || "—"}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {tab === "settings" && settings ? (
        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h2>تنظیمات برنامه</h2><p>نرخ‌ها و شرایط عمومی فقط برای مالک، مدیر ارشد یا دسترسی ویژه قابل تغییر است.</p></div>{!capabilities.can_manage_settings ? <span className={styles.readOnlyBadge}>فقط مشاهده</span> : null}</div>
          {settingsDirty ? <p>تغییرات ذخیره‌نشده دارید.</p> : null}
          <fieldset className={styles.fieldset} disabled={!capabilities.can_manage_settings}>
            <div className={styles.switches}><label><input type="checkbox" checked={settings.program_active} onChange={(event) => changeSettings({ ...settings, program_active: event.target.checked })} /><span>برنامه فعال باشد</span></label><label><input type="checkbox" checked={settings.registrations_open} onChange={(event) => changeSettings({ ...settings, registrations_open: event.target.checked })} /><span>عضویت عمومی باز باشد</span></label></div>
            <div className={styles.formGrid}>
              <label><span>عنوان عمومی</span><input value={settings.public_title} onChange={(event) => changeSettings({ ...settings, public_title: event.target.value })} /></label>
              <label className={styles.wide}><span>توضیح عمومی</span><textarea value={settings.public_description} onChange={(event) => changeSettings({ ...settings, public_description: event.target.value })} /></label>
              <label><span>اعتبار لینک (روز)</span><input type="number" value={settings.attribution_days} onChange={(event) => changeSettings({ ...settings, attribution_days: Number(event.target.value) })} /></label>
              <label><span>تخفیف مشتری (%)</span><input type="number" value={settings.customer_discount_percent} onChange={(event) => changeSettings({ ...settings, customer_discount_percent: Number(event.target.value) })} /></label>
              <label><span>پورسانت شروع (%)</span><input type="number" value={settings.bonus_commission_percent} onChange={(event) => changeSettings({ ...settings, bonus_commission_percent: Number(event.target.value) })} /></label>
              <label><span>پورسانت عادی (%)</span><input type="number" value={settings.regular_commission_percent} onChange={(event) => changeSettings({ ...settings, regular_commission_percent: Number(event.target.value) })} /></label>
              <label><span>تعداد فروش با نرخ شروع</span><input type="number" value={settings.bonus_qualified_sales_count} onChange={(event) => changeSettings({ ...settings, bonus_qualified_sales_count: Number(event.target.value) })} /></label>
              <label><span>دوره انتظار (روز)</span><input type="number" value={settings.commission_hold_days} onChange={(event) => changeSettings({ ...settings, commission_hold_days: Number(event.target.value) })} /></label>
              <label><span>حداقل تسویه (تومان)</span><input type="number" value={settings.minimum_payout_toman} onChange={(event) => changeSettings({ ...settings, minimum_payout_toman: Number(event.target.value) })} /></label>
              <label><span>روز بستن حساب</span><input type="number" value={settings.period_close_day} onChange={(event) => changeSettings({ ...settings, period_close_day: Number(event.target.value) })} /></label>
              <label><span>روز پرداخت ماه بعد</span><input type="number" value={settings.payout_day} onChange={(event) => changeSettings({ ...settings, payout_day: Number(event.target.value) })} /></label>
              <label><span>نام قانونی بهره‌بردار</span><input value={settings.legal_identity?.legal_name || ""} onChange={(event) => changeSettings({ ...settings, legal_identity: { ...settings.legal_identity, legal_name: event.target.value } })} /></label>
              <label><span>شماره پشتیبانی</span><input value={settings.legal_identity?.support_mobile || ""} onChange={(event) => changeSettings({ ...settings, legal_identity: { ...settings.legal_identity, support_mobile: event.target.value } })} /></label>
              <label className={styles.wide}><span>نشانی قانونی</span><textarea value={settings.legal_identity?.legal_address || ""} onChange={(event) => changeSettings({ ...settings, legal_identity: { ...settings.legal_identity, legal_address: event.target.value } })} /></label>
            </div>
            {capabilities.can_manage_settings ? <button disabled={Boolean(busyAction)} onClick={saveSettings}>{busyAction === "settings" ? "در حال ذخیره…" : "ذخیره تنظیمات"}</button> : null}
          </fieldset>
        </section>
      ) : null}

      {tab === "documents" && !loadedSections.documents ? <section className={styles.card}><div className={styles.loading}>در حال دریافت قوانین…</div></section> : null}
      {tab === "documents" && loadedSections.documents ? (
        <section className={styles.card}>
          <div className={styles.sectionHead}><div><h2>قوانین همکاری در فروش</h2><p>مدیران فاقد دسترسی حقوقی فقط نسخه‌های منتشرشده را مشاهده می‌کنند.</p></div>{!capabilities.can_manage_documents ? <span className={styles.readOnlyBadge}>فقط مشاهده</span> : null}</div>
          <div className={styles.docNav}>{docMeta.map(([key, label]) => <button key={key} onClick={() => selectDoc(key)}>{label}<small>{latest.get(key)?.status || "بدون نسخه"}</small></button>)}</div>
          <fieldset className={styles.fieldset} disabled={!capabilities.can_manage_documents}>
            <div className={styles.formGrid}>
              <label><span>کلید سند</span><input disabled value={docKey} /></label>
              <label><span>نسخه جدید</span><input value={docVersion} onChange={(event) => setDocVersion(event.target.value)} /></label>
              <label className={styles.wide}><span>عنوان</span><input value={docTitle} onChange={(event) => setDocTitle(event.target.value)} /></label>
              <label className={styles.wide}><span>خلاصه</span><textarea value={docSummary} onChange={(event) => setDocSummary(event.target.value)} /></label>
              <label className={styles.wide}><span>متن کامل</span><textarea className={styles.legalText} value={docBody} onChange={(event) => setDocBody(event.target.value)} /></label>
            </div>
            {capabilities.can_manage_documents ? <div className={styles.actions}><button disabled={Boolean(busyAction)} onClick={() => saveDoc(false)}>{busyAction === "save-document" ? "در حال ذخیره…" : "ذخیره پیش‌نویس"}</button><button disabled={Boolean(busyAction)} className={styles.danger} onClick={() => saveDoc(true)}>{busyAction === "publish-document" ? "در حال انتشار…" : "انتشار نسخه"}</button></div> : null}
          </fieldset>
        </section>
      ) : null}
    </main>
  );
}
