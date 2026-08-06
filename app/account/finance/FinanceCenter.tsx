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

function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
}

function WalletView() {
  return (
    <div className={styles.contentGrid}>
      <section className={`${styles.panel} ${styles.walletPanel}`}>
        <div>
          <span className={styles.panelEyebrow}>موجودی قابل استفاده</span>
          <strong className={styles.balance}>۰ تومان</strong>
          <p>موجودی نهایی پس از اتصال سرویس مالی حساب از سرور دریافت می‌شود.</p>
        </div>
        <div className={styles.actionRow}>
          <Link className={styles.primaryButton} href="/account/payments?intent=wallet_charge">
            افزایش موجودی
          </Link>
          <Link className={styles.secondaryButton} href="/account/payments">
            مشاهده تراکنش‌ها
          </Link>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.panelEyebrow}>کاربرد کیف پول</span>
            <h2>پرداخت سریع خدمات چاکود</h2>
          </div>
        </div>
        <div className={styles.featureList}>
          <div><b>۱</b><span><strong>ارتقای آگهی</strong><small>بالابر، ویژه و نمایش بالاتر</small></span></div>
          <div><b>۲</b><span><strong>رزرو تبلیغات</strong><small>استوری، بنر و جایگاه منطقه‌ای</small></span></div>
          <div><b>۳</b><span><strong>خرید اشتراک</strong><small>پلن حرفه‌ای کسب‌وکار و نمایشگاه</small></span></div>
        </div>
      </section>
    </div>
  );
}

function PaymentsView({ selectedIntent }: { selectedIntent: string }) {
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
  );
}

function InvoicesView() {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.panelEyebrow}>سوابق مالی</span>
          <h2>فاکتورهای حساب</h2>
        </div>
        <Link className={styles.secondaryButton} href="/account/payments">رفتن به پرداخت‌ها</Link>
      </div>
      <div className={styles.emptyState}>
        <span>⌁</span>
        <h3>هنوز فاکتوری صادر نشده است</h3>
        <p>بعد از ثبت اولین سفارش، فاکتور و وضعیت پرداخت آن در این بخش نمایش داده می‌شود.</p>
      </div>
    </section>
  );
}

function PromotionsView() {
  const products = [
    { code: "boost", title: "بالابر آگهی", price: 149_000, text: "انتقال آگهی به ابتدای نتایج مرتبط" },
    { code: "featured", title: "آگهی ویژه", price: 349_000, text: "نمایش برجسته‌تر و نشان ویژه" },
    { code: "story", title: "استوری منطقه‌ای", price: 690_000, text: "نمایش در استوری کاربران محدوده انتخابی" },
    { code: "banner", title: "بنر صفحه اصلی", price: 1_000_000, text: "رزرو جایگاه بنر براساس شهر و تعداد روز" },
  ];

  return (
    <div className={styles.cardGrid}>
      {products.map((product) => (
        <article className={styles.productCard} key={product.code}>
          <span className={styles.productBadge}>قابل سفارش</span>
          <h2>{product.title}</h2>
          <p>{product.text}</p>
          <strong>{formatToman(product.price)}</strong>
          <Link href={`/account/payments/checkout?type=promotion&product=${product.code}`}>
            انتخاب و پرداخت
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
  const config = modeConfig[mode];

  useEffect(() => {
    setQuery(window.location.search);
  }, []);

  const selectedIntent = useMemo(() => {
    if (!query) return "";
    return new URLSearchParams(query).get("intent") || "";
  }, [query]);

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

        {mode === "wallet" && <WalletView />}
        {mode === "payments" && <PaymentsView selectedIntent={selectedIntent} />}
        {mode === "invoices" && <InvoicesView />}
        {mode === "promotions" && <PromotionsView />}
        {mode === "subscriptions" && <SubscriptionsView />}
      </div>
      <MobileBottomNav />
    </main>
  );
}
