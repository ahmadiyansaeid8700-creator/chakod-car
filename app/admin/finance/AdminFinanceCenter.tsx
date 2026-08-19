"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./AdminFinanceCenter.module.css";

type AdminFinanceMode =
  | "orders"
  | "payments"
  | "invoices"
  | "refunds"
  | "subscriptions"
  | "pricing";

type FinanceRecord = Record<string, unknown>;

type FinanceResponse = {
  success?: boolean;
  message?: string;
  generated_at?: string;
  stats?: {
    paid_revenue_toman?: number;
    pending_orders?: number;
    failed_orders?: number;
    refund_requested_toman?: number;
    wallet_balance_toman?: number;
    orders_count?: number;
    invoices_count?: number;
  };
  orders?: FinanceRecord[];
  payment_attempts?: FinanceRecord[];
  invoices?: FinanceRecord[];
  refunds?: FinanceRecord[];
  wallets?: FinanceRecord[];
  wallet_transactions?: FinanceRecord[];
};

type CommerceService = {
  service_key: string;
  title: string;
  audience?: string;
  amount_toman: number;
  duration_value?: number;
  duration_unit?: string;
  is_active: boolean;
};

type CommerceSubscription = {
  id: number;
  dealer_id: number;
  service_key: string;
  status: string;
  starts_at?: string | null;
  expires_at?: string | null;
};

type CommerceResponse = {
  success?: boolean;
  message?: string;
  services?: CommerceService[];
  subscriptions?: CommerceSubscription[];
  payment_gateway_ready?: boolean;
};

const modeConfig: Record<AdminFinanceMode, { title: string; description: string }> = {
  orders: { title: "سفارش‌ها", description: "سفارش‌های کیف پول، خدمات، تبلیغات و اشتراک‌ها" },
  payments: { title: "پرداخت‌ها", description: "تلاش‌های درگاه، شناسه‌های بانکی و وضعیت تراکنش" },
  invoices: { title: "فاکتورها", description: "فاکتورهای صادرشده بعد از تأیید پرداخت" },
  refunds: { title: "بازپرداخت‌ها", description: "درخواست، بررسی و وضعیت بازگشت وجه" },
  subscriptions: { title: "اشتراک‌ها", description: "اشتراک‌های حرفه‌ای مجموعه‌ها در Commerce" },
  pricing: { title: "تعرفه‌ها", description: "محصولات فعال و قیمت canonical سامانه Commerce" },
};

const navigation: Array<{ mode: AdminFinanceMode; href: string; label: string }> = [
  { mode: "orders", href: "/admin/orders", label: "سفارش‌ها" },
  { mode: "payments", href: "/admin/payments", label: "پرداخت‌ها" },
  { mode: "invoices", href: "/admin/invoices", label: "فاکتورها" },
  { mode: "refunds", href: "/admin/refunds", label: "بازپرداخت" },
  { mode: "subscriptions", href: "/admin/subscriptions", label: "اشتراک‌ها" },
  { mode: "pricing", href: "/admin/pricing", label: "تعرفه‌ها" },
];

const statusLabels: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  payment_failed: "پرداخت ناموفق",
  paid: "پرداخت‌شده",
  created: "ایجادشده",
  issued: "صادرشده",
  requested: "درخواست‌شده",
  approved: "تأییدشده",
  processing: "در حال انجام",
  rejected: "ردشده",
  refunded: "بازگشت وجه",
  active: "فعال",
  expired: "منقضی",
  cancelled: "لغوشده",
};

function formatToman(value: unknown) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value || 0))} تومان`;
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("fa-IR").format(Number(value || 0));
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function value(record: FinanceRecord, ...keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return "";
}

function status(valueInput: unknown) {
  const code = String(valueInput || "");
  return statusLabels[code] || code || "نامشخص";
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.empty}>
      <span>⌁</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function FinanceTable({ mode, data }: { mode: AdminFinanceMode; data: FinanceResponse }) {
  if (mode === "orders") {
    const rows = data.orders || [];
    if (!rows.length) return <Empty title="سفارشی ثبت نشده است" text="سفارش‌های جدید پس از ایجاد در Checkout اینجا نمایش داده می‌شوند." />;
    return (
      <div className={styles.tableWrap}><table><thead><tr><th>شماره</th><th>نوع/خدمت</th><th>مبلغ</th><th>تخفیف</th><th>وضعیت</th><th>تاریخ</th></tr></thead><tbody>
        {rows.map((row) => <tr key={String(value(row, "id"))}><td dir="ltr">{String(value(row, "orderNo", "order_no"))}</td><td>{String(value(row, "productCode", "product_code"))}</td><td>{formatToman(value(row, "finalAmountToman", "final_amount_toman"))}</td><td>{formatToman(value(row, "discountToman", "discount_toman"))}</td><td><span className={styles.status}>{status(value(row, "status"))}</span></td><td>{formatDate(value(row, "createdAt", "created_at"))}</td></tr>)}
      </tbody></table></div>
    );
  }

  if (mode === "payments") {
    const rows = data.payment_attempts || [];
    if (!rows.length) return <Empty title="تلاش پرداختی ثبت نشده است" text="پس از اتصال درگاه و شروع پرداخت، رکوردها در این جدول دیده می‌شوند." />;
    return (
      <div className={styles.tableWrap}><table><thead><tr><th>سفارش</th><th>درگاه</th><th>Authority</th><th>شناسه بانکی</th><th>مبلغ</th><th>وضعیت</th><th>زمان پرداخت</th></tr></thead><tbody>
        {rows.map((row) => <tr key={String(value(row, "id"))}><td>{formatNumber(value(row, "orderId", "order_id"))}</td><td>{String(value(row, "gateway"))}</td><td dir="ltr">{String(value(row, "authority"))}</td><td dir="ltr">{String(value(row, "gatewayTransactionId", "gateway_transaction_id")) || "—"}</td><td>{formatToman(value(row, "amountToman", "amount_toman"))}</td><td><span className={styles.status}>{status(value(row, "status"))}</span></td><td>{formatDate(value(row, "paidAt", "paid_at"))}</td></tr>)}
      </tbody></table></div>
    );
  }

  if (mode === "invoices") {
    const rows = data.invoices || [];
    if (!rows.length) return <Empty title="فاکتوری صادر نشده است" text="فاکتور پس از Verify موفق سمت سرور صادر می‌شود." />;
    return (
      <div className={styles.tableWrap}><table><thead><tr><th>شماره فاکتور</th><th>سفارش</th><th>مبلغ</th><th>وضعیت</th><th>تاریخ صدور</th></tr></thead><tbody>
        {rows.map((row) => <tr key={String(value(row, "id"))}><td dir="ltr">{String(value(row, "invoiceNo", "invoice_no"))}</td><td>{formatNumber(value(row, "orderId", "order_id"))}</td><td>{formatToman(value(row, "amountToman", "amount_toman"))}</td><td><span className={styles.status}>{status(value(row, "status"))}</span></td><td>{formatDate(value(row, "issuedAt", "issued_at"))}</td></tr>)}
      </tbody></table></div>
    );
  }

  const rows = data.refunds || [];
  if (!rows.length) return <Empty title="درخواست بازپرداختی وجود ندارد" text="درخواست‌های بازگشت وجه بعد از ثبت، همراه مبلغ و مقصد نمایش داده می‌شوند." />;
  return (
    <div className={styles.tableWrap}><table><thead><tr><th>سفارش</th><th>پرداخت</th><th>مبلغ</th><th>مقصد</th><th>علت</th><th>وضعیت</th><th>تاریخ</th></tr></thead><tbody>
      {rows.map((row) => <tr key={String(value(row, "id"))}><td>{formatNumber(value(row, "orderId", "order_id"))}</td><td>{formatNumber(value(row, "paymentAttemptId", "payment_attempt_id"))}</td><td>{formatToman(value(row, "amountToman", "amount_toman"))}</td><td>{String(value(row, "destination"))}</td><td>{String(value(row, "reason")) || "—"}</td><td><span className={styles.status}>{status(value(row, "status"))}</span></td><td>{formatDate(value(row, "createdAt", "created_at"))}</td></tr>)}
    </tbody></table></div>
  );
}

export default function AdminFinanceCenter({ mode }: { mode: AdminFinanceMode }) {
  const [finance, setFinance] = useState<FinanceResponse | null>(null);
  const [commerce, setCommerce] = useState<CommerceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const config = modeConfig[mode];

  async function load() {
    setLoading(true);
    setError("");
    try {
      const requests: Promise<Response>[] = [
        fetch("/api/admin/finance?limit=150", { cache: "no-store", credentials: "include" }),
      ];
      if (mode === "subscriptions" || mode === "pricing") {
        requests.push(fetch("/api/auth/commerce", { cache: "no-store", credentials: "include" }));
      }
      const responses = await Promise.all(requests);
      const financePayload = await readJson<FinanceResponse>(responses[0]);
      if (!responses[0].ok || !financePayload?.success) {
        throw new Error(financePayload?.message || "گزارش مالی دریافت نشد.");
      }
      setFinance(financePayload);

      if (responses[1]) {
        const commercePayload = await readJson<CommerceResponse>(responses[1]);
        if (!responses[1].ok || !commercePayload?.success) {
          throw new Error(commercePayload?.message || "اطلاعات Commerce دریافت نشد.");
        }
        setCommerce(commercePayload);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [mode]);

  const stats = finance?.stats || {};
  const activeServices = useMemo(
    () => (commerce?.services || []).filter((item) => item.is_active),
    [commerce?.services],
  );

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div><Link href="/admin">← مدیریت</Link><span>مدیریت مالی چاکود</span><h1>{config.title}</h1><p>{config.description}</p></div>
          <button type="button" onClick={() => void load()}>به‌روزرسانی</button>
        </header>

        <nav className={styles.navigation} aria-label="بخش‌های مدیریت مالی">
          {navigation.map((item) => <Link key={item.mode} className={item.mode === mode ? styles.active : ""} href={item.href}>{item.label}</Link>)}
        </nav>

        <section className={styles.stats}>
          <article><span>درآمد تأییدشده</span><strong>{formatToman(stats.paid_revenue_toman)}</strong></article>
          <article><span>سفارش در انتظار</span><strong>{formatNumber(stats.pending_orders)}</strong></article>
          <article><span>پرداخت ناموفق</span><strong>{formatNumber(stats.failed_orders)}</strong></article>
          <article><span>بازپرداخت در جریان</span><strong>{formatToman(stats.refund_requested_toman)}</strong></article>
          <article><span>موجودی کیف پول‌ها</span><strong>{formatToman(stats.wallet_balance_toman)}</strong></article>
        </section>

        {loading && <section className={styles.state}><span className={styles.loader}/><h2>در حال دریافت گزارش مالی</h2></section>}
        {!loading && error && <section className={styles.state}><span>!</span><h2>گزارش مالی در دسترس نیست</h2><p>{error}</p><button onClick={() => void load()}>تلاش دوباره</button></section>}

        {!loading && !error && finance && ["orders", "payments", "invoices", "refunds"].includes(mode) && (
          <section className={styles.panel}><FinanceTable mode={mode} data={finance}/></section>
        )}

        {!loading && !error && mode === "subscriptions" && (
          <section className={styles.panel}>
            {(commerce?.subscriptions || []).length ? (
              <div className={styles.tableWrap}><table><thead><tr><th>شناسه</th><th>مجموعه</th><th>خدمت</th><th>وضعیت</th><th>شروع</th><th>انقضا</th></tr></thead><tbody>
                {commerce!.subscriptions!.map((item) => <tr key={item.id}><td>{formatNumber(item.id)}</td><td>{formatNumber(item.dealer_id)}</td><td dir="ltr">{item.service_key}</td><td><span className={styles.status}>{status(item.status)}</span></td><td>{formatDate(item.starts_at)}</td><td>{formatDate(item.expires_at)}</td></tr>)}
              </tbody></table></div>
            ) : <Empty title="اشتراک فعالی ثبت نشده است" text="اشتراک‌های Commerce بعد از خرید و فعال‌سازی در اینجا دیده می‌شوند."/>}
          </section>
        )}

        {!loading && !error && mode === "pricing" && (
          <section className={styles.pricingGrid}>
            {activeServices.map((service) => <article key={service.service_key}><span>{service.audience || "محصول فعال"}</span><h2>{service.title}</h2><strong>{formatToman(service.amount_toman)}</strong><small>{service.duration_value ? `${formatNumber(service.duration_value)} ${service.duration_unit || "روز"}` : "بدون مدت ثابت"}</small><code>{service.service_key}</code></article>)}
            {!activeServices.length && <Empty title="تعرفه فعالی دریافت نشد" text="تعرفه‌ها باید در Commerce canonical تعریف شوند."/>}
            <div className={styles.pricingNotice}>ویرایش تعرفه عمداً در این نسخه غیرفعال است تا قرارداد نوشتن canonical بک‌اند مشخص شود و سیستم قیمت‌گذاری موازی ساخته نشود.</div>
          </section>
        )}
      </div>
    </main>
  );
}
