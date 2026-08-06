"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MobileBottomNav from "../../components/MobileBottomNav";
import styles from "./FinanceCenter.module.css";

type FinanceMode =
  | "wallet"
  | "payments"
  | "invoices"
  | "promotions"
  | "subscriptions";

type FinanceCenterProps = {
  mode: FinanceMode;
};

type ModeConfig = {
  title: string;
  description: string;
  eyebrow: string;
};

type WalletSummary = {
  available_balance_toman: number;
  blocked_balance_toman: number;
  status: string;
};

type WalletTransaction = {
  id: number;
  direction: string;
  transactionType: string;
  amountToman: number;
  balanceAfterToman: number;
  status: string;
  description: string;
  createdAt: string;
};

type FinanceOrder = {
  id: number;
  orderNo: string;
  orderType: string;
  productCode: string;
  finalAmountToman: number;
  status: string;
  createdAt: string;
};

type FinanceInvoice = {
  id: number;
  invoiceNo: string;
  amountToman: number;
  status: string;
  issuedAt: string;
};

type FinanceSummaryResponse = {
  success?: boolean;
  message?: string;
  wallet?: WalletSummary;
  transactions?: WalletTransaction[];
  orders?: FinanceOrder[];
  invoices?: FinanceInvoice[];
};

const modeConfig: Record<FinanceMode, ModeConfig> = {
  wallet: {
    title: "کیف پول چاکود",
    description: "موجودی، افزایش اعتبار و گردش مالی حساب را از این بخش مدیریت کنید.",
    eyebrow: "CHAKOD WALLET",
  },
  payments: {
    title: "پرداخت‌های من",
    description: "پرداخت کیف پول، تبلیغات، اشتراک‌ها و خدمات ویژه از یک مسیر امن انجام می‌شود.",
    eyebrow: "PAYMENT CENTER",
  },
  invoices: {
    title: "فاکتورها",
    description: "فاکتورهای صادرشده، وضعیت پرداخت و جزئیات هر سفارش را مشاهده کنید.",
    eyebrow: "INVOICES",
  },
  promotions: {
    title: "تبلیغات و ارتقای نمایش",
    description: "جایگاه مناسب را انتخاب کنید و آگهی یا کسب‌وکار خود را بیشتر دیده کنید.",
    eyebrow: "PROMOTIONS",
  },
  subscriptions: {
    title: "اشتراک‌ها",
    description: "پلن مناسب حساب شخصی، نمایشگاه یا کسب‌وکار خودرویی را مدیریت کنید.",
    eyebrow: "SUBSCRIPTIONS",
  },
};

const navItems: Array<{ mode: FinanceMode; label: string; href: string }> = [
  { mode: "wallet", label: "کیف پول", href: "/account/wallet" },
  { mode: "payments", label: "پرداخت‌ها", href: "/account/payments" },
  { mode: "invoices", label: "فاکتورها", href: "/account/invoices" },
  { mode: "promotions", label: "تبلیغات", href: "/account/promotions" },
  { mode: "subscriptions", label: "اشتراک‌ها", href: "/account/subscriptions" },
];

const statusTitles: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  payment_failed: "پرداخت ناموفق",
  paid: "پرداخت‌شده",
  issued: "صادرشده",
  completed: "تکمیل‌شده",
  active: "فعال",
};

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value || 0))} تومان`;
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("chakod_session_token") || "";
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
    : {};
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function StatePanel({ loading, error }: { loading: boolean; error: string }) {
  if (!loading && !error) return null;

  return (
    <section className={styles.panel}>
      <div className={styles.emptyState}>
        <span>{loading ? "…" : "!"}</span>
        <h3>{loading ? "در حال دریافت اطلاعات مالی" : "اطلاعات مالی در دسترس نیست"}</h3>
        <p>{loading ? "موجودی، سفارش‌ها و فاکتورها در حال دریافت هستند." : error}</p>
      </div>
    </section>
  );
}

function WalletView({ summary }: { summary: FinanceSummaryResponse | null }) {
  const wallet = summary?.wallet;
  const transactions = summary?.transactions || [];

  return (
    <div className={styles.contentGrid}>
      <section className={`${styles.panel} ${styles.walletPanel}`}>
        <div>
          <span className={styles.panelEyebrow}>موجودی قابل استفاده</span>
          <strong className={styles.balance}>{formatToman(wallet?.available_balance_toman || 0)}</strong>
          <p>
            موجودی مسدودشده: {formatToman(wallet?.blocked_balance_toman || 0)} · وضعیت: {statusTitles[wallet?.status || ""] || wallet?.status || "نامشخص"}
          </p>
        </div>
        <div className={styles.actionRow}>
          <Link className={styles.primaryButton} href="/account/payments/checkout?type=wallet_charge">
            افزایش موجودی
          </Link>
          <Link className={styles.secondaryButton} href="/account/payments">
            مشاهده سفارش‌ها
          </Link>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.panelEyebrow}>گردش کیف پول</span>
            <h2>آخرین تراکنش‌ها</h2>
          </div>
        </div>
        {transactions.length ? (
          <div className={styles.featureList}>
            {transactions.slice(0, 8).map((item) => (
              <div key={item.id}>
                <b>{item.direction === "credit" ? "+" : "−"}</b>
                <span>
                  <strong>{item.description || item.transactionType}</strong>
                  <small>{formatToman(item.amountToman)} · {formatDate(item.createdAt)}</small>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span>⌁</span>
            <h3>هنوز تراکنشی ثبت نشده است</h3>
            <p>بعد از اولین شارژ یا خرید با کیف پول، گردش حساب در این بخش نمایش داده می‌شود.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function PaymentsView({
  selectedIntent,
  orders,
}: {
  selectedIntent: string;
  orders: FinanceOrder[];
}) {
  const items = [
    {
      code: "wallet_charge",
      title: "افزایش موجودی کیف پول",
      text: "اعتبار حساب را برای خریدهای بعدی شارژ کنید.",
      href: "/account/payments/checkout?type=wallet_charge",
    },
    {
      code: "promotion",
      title: "پرداخت تبلیغات و ارتقا",
      text: "هزینه ویژه‌کردن، استوری، بنر و نمایش بالاتر را پرداخت کنید.",
      href: "/account/promotions",
    },
    {
      code: "subscription",
      title: "پرداخت اشتراک",
      text: "اشتراک حرفه‌ای حساب تجاری یا نمایشگاه را فعال کنید.",
      href: "/account/subscriptions",
    },
  ];

  return (
    <>
      <div className={styles.cardGrid}>
        {items.map((item) => (
          <Link
            key={item.code}
            className={`${styles.serviceCard} ${selectedIntent === item.code ? styles.serviceCardActive : ""}`}
            href={item.href}
          >
            <span className={styles.serviceIcon}>↗</span>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
            <strong>ادامه فرایند</strong>
          </Link>
        ))}
      </div>

      <section className={styles.panel} style={{ marginTop: 18 }}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.panelEyebrow}>سوابق سفارش</span>
            <h2>آخرین پرداخت‌ها و سفارش‌ها</h2>
          </div>
        </div>
        {orders.length ? (
          <div className={styles.featureList}>
            {orders.map((order) => (
              <div key={order.id}>
                <b>س</b>
                <span>
                  <strong>{order.orderNo} · {statusTitles[order.status] || order.status}</strong>
                  <small>{formatToman(order.finalAmountToman)} · {formatDate(order.createdAt)}</small>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span>⌁</span>
            <h3>هنوز سفارشی ساخته نشده است</h3>
            <p>سفارش‌های کیف پول، تبلیغات و اشتراک در این بخش نمایش داده می‌شوند.</p>
          </div>
        )}
      </section>
    </>
  );
}

function InvoicesView({ invoiceRows }: { invoiceRows: FinanceInvoice[] }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.panelEyebrow}>سوابق مالی</span>
          <h2>فاکتورهای حساب</h2>
        </div>
        <Link className={styles.secondaryButton} href="/account/payments">رفتن به پرداخت‌ها</Link>
      </div>
      {invoiceRows.length ? (
        <div className={styles.featureList}>
          {invoiceRows.map((invoice) => (
            <div key={invoice.id}>
              <b>ف</b>
              <span>
                <strong>{invoice.invoiceNo} · {statusTitles[invoice.status] || invoice.status}</strong>
                <small>{formatToman(invoice.amountToman)} · {formatDate(invoice.issuedAt)}</small>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span>⌁</span>
          <h3>هنوز فاکتوری صادر نشده است</h3>
          <p>بعد از تأیید اولین پرداخت، فاکتور رسمی آن در این بخش نمایش داده می‌شود.</p>
        </div>
      )}
    </section>
  );
}

function PromotionsView() {
  const products = [
    { code: "boost", title: "بالابر آگهی", price: 149_000, text: "انتقال آگهی به ابتدای نتایج مرتبط" },
    { code: "featured", title: "آگهی ویژه", price: 349_000, text: "نمایش برجسته‌تر و نشان ویژه" },
    { code: "story", title: "استوری منطقه‌ای", price: 690_000, text: "نمایش در استوری کاربران محدوده انتخابی" },
    { code: "banner", title: "بنر صفحه اصلی", price: 0, text: "محاسبه براساس استان، ظرفیت و تعداد روز" },
  ];

  return (
    <div className={styles.cardGrid}>
      {products.map((product) => (
        <article className={styles.productCard} key={product.code}>
          <span className={styles.productBadge}>قابل سفارش</span>
          <h2>{product.title}</h2>
          <p>{product.text}</p>
          <strong>{product.price ? formatToman(product.price) : "محاسبه در فرم رزرو"}</strong>
          <Link
            href={product.code === "banner"
              ? "/account/ads"
              : `/account/payments/checkout?type=promotion&product=${product.code}`}
          >
            {product.code === "banner" ? "انتخاب استان و تاریخ" : "انتخاب و پرداخت"}
          </Link>
        </article>
      ))}
    </div>
  );
}

function SubscriptionsView() {
  const plans = [
    {
      code: "starter",
      title: "پایه",
      price: 0,
      features: ["پروفایل عمومی", "مدیریت اطلاعات", "نمایش در جست‌وجوی محلی"],
    },
    {
      code: "professional",
      title: "حرفه‌ای",
      price: 1_490_000,
      features: ["جایگاه بالاتر", "آمار حرفه‌ای", "نمونه‌کار بیشتر", "پشتیبانی اولویت‌دار"],
    },
    {
      code: "dealership",
      title: "نمایشگاه حرفه‌ای",
      price: 2_490_000,
      features: ["مدیریت تیم", "موجودی خودرو", "گزارش تماس", "امکانات تبلیغاتی"],
    },
  ];

  return (
    <div className={styles.planGrid}>
      {plans.map((plan) => (
        <article className={`${styles.planCard} ${plan.code === "professional" ? styles.planFeatured : ""}`} key={plan.code}>
          <span>{plan.code === "professional" ? "پیشنهاد چاکود" : "پلن حساب"}</span>
          <h2>{plan.title}</h2>
          <strong>{plan.price ? `${formatToman(plan.price)} / ماه` : "رایگان"}</strong>
          <ul>
            {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
          </ul>
          {plan.price ? (
            <Link href={`/account/payments/checkout?type=subscription&plan=${plan.code}`}>انتخاب اشتراک</Link>
          ) : (
            <Link href="/account">پلن فعلی</Link>
          )}
        </article>
      ))}
    </div>
  );
}

export default function FinanceCenter({ mode }: FinanceCenterProps) {
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState<FinanceSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const config = modeConfig[mode];

  useEffect(() => {
    setQuery(window.location.search);

    async function loadFinance() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/finance/summary", {
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const result = await readJson<FinanceSummaryResponse>(response);
        if (!response.ok || !result?.success) {
          setError(result?.message || "دریافت اطلاعات مالی انجام نشد.");
          return;
        }
        setSummary(result);
      } catch {
        setError("ارتباط با سرویس مالی برقرار نشد.");
      } finally {
        setLoading(false);
      }
    }

    void loadFinance();
  }, []);

  const selectedIntent = useMemo(() => {
    if (!query) return "";
    return new URLSearchParams(query).get("intent") || "";
  }, [query]);

  const needsSummary = mode === "wallet" || mode === "payments" || mode === "invoices";

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/">
            <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
          </Link>
          <div className={styles.headerActions}>
            <Link href="/account">حساب کاربری</Link>
            <Link className={styles.headerPrimary} href="/account/listings/new">ثبت آگهی</Link>
          </div>
        </header>

        <section className={styles.hero}>
          <span>{config.eyebrow}</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </section>

        <nav className={styles.financeNav} aria-label="بخش‌های مالی حساب">
          {navItems.map((item) => (
            <Link
              key={item.mode}
              className={item.mode === mode ? styles.activeNav : undefined}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {needsSummary && <StatePanel loading={loading} error={error} />}
        {mode === "wallet" && !loading && !error && <WalletView summary={summary} />}
        {mode === "payments" && !loading && !error && (
          <PaymentsView selectedIntent={selectedIntent} orders={summary?.orders || []} />
        )}
        {mode === "invoices" && !loading && !error && (
          <InvoicesView invoiceRows={summary?.invoices || []} />
        )}
        {mode === "promotions" && <PromotionsView />}
        {mode === "subscriptions" && <SubscriptionsView />}
      </div>
      <MobileBottomNav />
    </main>
  );
}
