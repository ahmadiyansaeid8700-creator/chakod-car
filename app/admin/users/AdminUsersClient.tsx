"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type UserStatus = "active" | "suspended" | "blocked" | "disabled" | "deleted" | string;

type AdminUser = {
  id: number;
  mobile: string;
  full_name?: string | null;
  account_type: string;
  business_name?: string | null;
  phone_verified: boolean;
  terms_accepted: boolean;
  status: UserStatus;
  created_at?: string | null;
  updated_at?: string | null;
  last_login_at?: string | null;
  suspended_at?: string | null;
  deleted_at?: string | null;
};

type Stats = {
  total: number;
  active: number;
  suspended: number;
  deleted: number;
  business: number;
};

type UsersResponse = {
  success?: boolean;
  message?: string;
  items?: AdminUser[];
  total?: number;
  limit?: number;
  offset?: number;
  stats?: Partial<Stats>;
  can_manage?: boolean;
};

type MutationResponse = {
  success?: boolean;
  message?: string;
  item?: AdminUser | null;
};

const accountTypeLabels: Record<string, string> = {
  personal: "شخصی",
  dealer: "نمایشگاه",
  parts_store: "فروشگاه قطعات",
  repair_shop: "تعمیرگاه",
  business: "کسب‌وکار",
};

const statusLabels: Record<string, string> = {
  active: "فعال",
  suspended: "تعلیق‌شده",
  blocked: "مسدود",
  disabled: "غیرفعال",
  deleted: "حذف‌شده",
};

function getToken() {
  return typeof window === "undefined"
    ? ""
    : localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return { success: false, message: "پاسخ سرور معتبر نیست." } as T;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusClass(status: string) {
  if (status === "active") return styles.active;
  if (status === "suspended") return styles.suspended;
  if (status === "deleted") return styles.deleted;
  return styles.inactive;
}

export default function AdminUsersClient() {
  const pageSize = 50;
  const [items, setItems] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, suspended: 0, deleted: 0, business: 0 });
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [accountType, setAccountType] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const search = useMemo(() => {
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    if (accountType) params.set("account_type", accountType);
    return params.toString();
  }, [accountType, offset, query, status]);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/users?${search}`, {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const result = await readJson<UsersResponse>(response);

      if (!response.ok || !result.success) {
        throw new Error(result.message || "دریافت کاربران انجام نشد.");
      }

      setItems(Array.isArray(result.items) ? result.items : []);
      setTotal(Number(result.total || 0));
      setStats({
        total: Number(result.stats?.total || 0),
        active: Number(result.stats?.active || 0),
        suspended: Number(result.stats?.suspended || 0),
        deleted: Number(result.stats?.deleted || 0),
        business: Number(result.stats?.business || 0),
      });
      setCanManage(Boolean(result.can_manage));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "دریافت کاربران انجام نشد.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [search]);

  useEffect(() => {
    setOffset(0);
  }, [query, status, accountType]);

  async function changeStatus(item: AdminUser, action: "suspend" | "reactivate") {
    if (!canManage || savingId !== null) return;

    const prompt = action === "suspend"
      ? `حساب ${item.full_name || item.mobile || `#${item.id}`} تعلیق شود؟ نشست‌های فعال این کاربر هم باطل می‌شوند.`
      : `حساب ${item.full_name || item.mobile || `#${item.id}`} دوباره فعال شود؟`;

    if (!window.confirm(prompt)) return;

    setSavingId(item.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ user_id: item.id, action }),
      });
      const result = await readJson<MutationResponse>(response);

      if (!response.ok || !result.success || !result.item) {
        throw new Error(result.message || "تغییر وضعیت حساب انجام نشد.");
      }

      setItems((current) => current.map((row) => row.id === item.id ? result.item! : row));
      setMessage(result.message || "وضعیت حساب ذخیره شد.");
      window.setTimeout(() => void load(), 400);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تغییر وضعیت حساب انجام نشد.");
    } finally {
      setSavingId(null);
    }
  }

  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + pageSize, total);
  const hasPrevious = offset > 0;
  const hasNext = offset + pageSize < total;

  return (
    <main className={styles.page} dir="rtl">
      <header className={styles.header}>
        <div>
          <span>مدیریت چاکود</span>
          <h1>کاربران پلتفرم</h1>
          <p>فهرست کاربران احراز هویت‌شده، وضعیت حساب و دسترسی امن برای تعلیق یا فعال‌سازی مجدد.</p>
        </div>
        <nav>
          <a href="/admin">داشبورد مدیریت</a>
          <a href="/admin/admins">دسترسی مدیران</a>
          <a href="/admin/audit-logs">گزارش تغییرات</a>
        </nav>
      </header>

      <section className={styles.stats} aria-label="آمار کاربران">
        <div><span>کل کاربران</span><strong>{stats.total.toLocaleString("fa-IR")}</strong></div>
        <div><span>فعال</span><strong>{stats.active.toLocaleString("fa-IR")}</strong></div>
        <div><span>تعلیق‌شده</span><strong>{stats.suspended.toLocaleString("fa-IR")}</strong></div>
        <div><span>حساب کسب‌وکار</span><strong>{stats.business.toLocaleString("fa-IR")}</strong></div>
        <div><span>حذف‌شده</span><strong>{stats.deleted.toLocaleString("fa-IR")}</strong></div>
      </section>

      <section className={styles.toolbar}>
        <label>
          <span>جست‌وجو</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="نام، موبایل، نام کسب‌وکار یا شناسه"
          />
        </label>
        <label>
          <span>نوع حساب</span>
          <select value={accountType} onChange={(event) => setAccountType(event.target.value)}>
            <option value="">همه نوع‌ها</option>
            {Object.entries(accountTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>وضعیت</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="suspended">تعلیق‌شده</option>
            <option value="blocked">مسدود</option>
            <option value="disabled">غیرفعال</option>
            <option value="deleted">حذف‌شده</option>
          </select>
        </label>
        <button type="button" onClick={() => void load()} disabled={loading}>تازه‌سازی</button>
      </section>

      {message ? <div className={styles.success}>{message}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      {!loading && !canManage ? (
        <div className={styles.notice}>دسترسی فعلی فقط مشاهده است. تعلیق و فعال‌سازی مجدد برای مدیران مجاز نمایش داده می‌شود.</div>
      ) : null}

      <section className={styles.list} aria-live="polite">
        {loading ? (
          <div className={styles.state}>در حال دریافت کاربران…</div>
        ) : items.length === 0 ? (
          <div className={styles.state}>کاربری با این فیلتر پیدا نشد.</div>
        ) : items.map((item) => (
          <article className={styles.card} key={item.id}>
            <div className={styles.identity}>
              <div className={styles.avatar}>{(item.full_name || item.business_name || "چ").trim().charAt(0) || "چ"}</div>
              <div className={styles.identityText}>
                <span>کاربر #{item.id.toLocaleString("fa-IR")}</span>
                <h2>{item.full_name || "نام ثبت نشده"}</h2>
                <p>{item.mobile || "شماره موبایل ثبت نشده"}</p>
              </div>
              <em className={`${styles.status} ${statusClass(item.status)}`}>{statusLabels[item.status] || item.status}</em>
            </div>

            <div className={styles.meta}>
              <div><span>نوع حساب</span><strong>{accountTypeLabels[item.account_type] || item.account_type}</strong></div>
              <div><span>کسب‌وکار</span><strong>{item.business_name || "—"}</strong></div>
              <div><span>تأیید موبایل</span><strong>{item.phone_verified ? "تأییدشده" : "تأیید نشده"}</strong></div>
              <div><span>پذیرش قوانین</span><strong>{item.terms_accepted ? "ثبت شده" : "ثبت نشده"}</strong></div>
              <div><span>عضویت</span><strong>{formatDate(item.created_at)}</strong></div>
              <div><span>آخرین ورود</span><strong>{formatDate(item.last_login_at)}</strong></div>
            </div>

            {item.suspended_at ? <p className={styles.detail}>زمان تعلیق: {formatDate(item.suspended_at)}</p> : null}
            {item.deleted_at ? <p className={styles.detail}>زمان حذف: {formatDate(item.deleted_at)}</p> : null}

            {canManage && item.status !== "deleted" ? (
              <div className={styles.actions}>
                {item.status === "suspended" || item.status === "blocked" || item.status === "disabled" ? (
                  <button
                    type="button"
                    className={styles.reactivate}
                    disabled={savingId === item.id}
                    onClick={() => void changeStatus(item, "reactivate")}
                  >
                    {savingId === item.id ? "در حال ذخیره…" : "فعال‌سازی مجدد"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.suspendButton}
                    disabled={savingId === item.id}
                    onClick={() => void changeStatus(item, "suspend")}
                  >
                    {savingId === item.id ? "در حال ذخیره…" : "تعلیق حساب"}
                  </button>
                )}
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <footer className={styles.pagination}>
        <span>{total ? `نمایش ${start.toLocaleString("fa-IR")} تا ${end.toLocaleString("fa-IR")} از ${total.toLocaleString("fa-IR")}` : "بدون نتیجه"}</span>
        <div>
          <button type="button" disabled={!hasPrevious || loading} onClick={() => setOffset((value) => Math.max(0, value - pageSize))}>صفحه قبل</button>
          <button type="button" disabled={!hasNext || loading} onClick={() => setOffset((value) => value + pageSize)}>صفحه بعد</button>
        </div>
      </footer>
    </main>
  );
}
