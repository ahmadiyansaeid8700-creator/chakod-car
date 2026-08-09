import Link from "next/link";

import styles from "./AdminSectionNav.module.css";

const primaryLinks = [
  { href: "/admin", label: "داشبورد" },
  { href: "/admin/listings", label: "آگهی‌ها" },
  { href: "/admin/businesses", label: "کسب‌وکارها" },
  { href: "/admin/users", label: "کاربران" },
  { href: "/admin/support", label: "پشتیبانی" },
];

const contentLinks = [
  { href: "/admin/articles", label: "مقالات" },
  { href: "/admin/advertising", label: "تبلیغات" },
  { href: "/admin/featured-showrooms", label: "نمایشگاه منتخب" },
];

const commerceLinks = [
  { href: "/admin/commerce", label: "مرکز مالی و تجاری" },
  { href: "/admin/orders", label: "سفارش‌ها" },
  { href: "/admin/payments", label: "پرداخت‌ها" },
  { href: "/admin/invoices", label: "فاکتورها" },
  { href: "/admin/refunds", label: "بازپرداخت" },
  { href: "/admin/subscriptions", label: "اشتراک‌ها" },
  { href: "/admin/pricing", label: "تعرفه‌ها" },
];

const systemLinks = [
  { href: "/admin/admins", label: "دسترسی مدیران" },
  { href: "/admin/audit-logs", label: "گزارش تغییرات" },
];

function NavGroup({
  label,
  links,
}: {
  label: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <details className={styles.group}>
      <summary>{label}</summary>
      <div className={styles.menu}>
        {links.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

export default function AdminSectionNav() {
  return (
    <nav className={styles.navigation} aria-label="منوی مدیریت چاکود" dir="rtl">
      <div className={styles.inner}>
        <div className={styles.mainLinks}>
          {primaryLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}

          <NavGroup label="محتوا و تبلیغات" links={contentLinks} />
          <NavGroup label="مالی و تجاری" links={commerceLinks} />
          <NavGroup label="مدیریت سیستم" links={systemLinks} />
        </div>

        <Link className={styles.siteLink} href="/">
          مشاهده سایت
        </Link>
      </div>
    </nav>
  );
}
