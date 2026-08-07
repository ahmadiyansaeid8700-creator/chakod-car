"use client";

import Link from "next/link";

import styles from "./Footer.module.css";

const footerLinkGroups = [
  {
    title: "خودرو",
    links: [
      { label: "جست‌وجوی خودرو", href: "/cars" },
      { label: "خودروهای لوکس", href: "/cars/luxury" },
      { label: "خودروهای منطقه آزاد", href: "/cars/free-zone" },
      { label: "ثبت رایگان آگهی", href: "/account/listings/new" },
      { label: "راهنمای قیمت", href: "/cars/price-guide" },
    ],
  },
  {
    title: "نمایشگاه و کسب‌وکار",
    links: [
      { label: "صفحه نمایشگاه‌ها", href: "/dealerships" },
      { label: "مدیریت نمایشگاه", href: "/account/business" },
      { label: "مراکز خدمات خودرو", href: "/businesses?type=car_service" },
      { label: "فروشگاه‌های قطعات", href: "/businesses?type=parts_store" },
      { label: "پشتیبانی فروشندگان", href: "/support" },
    ],
  },
  {
    title: "چاکود",
    links: [
      { label: "درباره ما", href: "/about" },
      { label: "مجله چاکود", href: "/articles" },
      { label: "مرکز راهنما", href: "/support" },
      { label: "قوانین استفاده", href: "/rules" },
      { label: "شرایط استفاده", href: "/terms" },
      { label: "سیاست بازپرداخت", href: "/refund-policy" },
      { label: "حریم خصوصی", href: "/privacy" },
      { label: "اطلاعات حقوقی", href: "/legal" },
      { label: "تماس با ما", href: "/contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer} dir="rtl">
      <div className={styles.inner}>
        <section className={styles.topGrid}>
          <div className={styles.brandColumn}>
            <Link className={styles.brandLink} href="/" aria-label="صفحه اصلی چاکود">
              <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
            </Link>
            <p>پلتفرم رشد کسب و کار</p>
            <span>
              مرجع هوشمند خودرو، نمایشگاه‌ها و کسب‌وکارهای خودرویی در سراسر ایران.
            </span>
            <div className={styles.brandActions}>
              <Link className={styles.primaryAction} href="/account/listings/new">
                ثبت آگهی خودرو
              </Link>
              <Link className={styles.secondaryAction} href="/account/business">
                ورود کسب‌وکارها
              </Link>
            </div>
          </div>

          {footerLinkGroups.map((group) => (
            <nav className={styles.linkColumn} key={group.title} aria-label={group.title}>
              <strong>{group.title}</strong>
              {group.links.map((item) => (
                <Link href={item.href} key={`${group.title}-${item.label}`}>
                  {item.label}
                </Link>
              ))}
            </nav>
          ))}

          <aside className={styles.trustColumn}>
            <strong>اعتماد و دسترسی</strong>
            <div className={styles.trustBadge}>پاسخ‌گویی شفاف</div>
            <div className={styles.trustBadge}>حفظ حریم خصوصی</div>
            <div className={styles.trustBadge}>پوشش سراسری ایران</div>
            <Link href="/support">مرکز پشتیبانی چاکود</Link>
          </aside>
        </section>

        <section className={styles.bottomBar}>
          <span>© {new Date().getFullYear()} چاکود — تمامی حقوق محفوظ است.</span>
          <div>
            <Link href="/privacy">حریم خصوصی</Link>
            <Link href="/terms">شرایط استفاده</Link>
            <Link href="/refund-policy">بازپرداخت</Link>
            <Link href="/support">پشتیبانی</Link>
          </div>
        </section>
      </div>
    </footer>
  );
}
