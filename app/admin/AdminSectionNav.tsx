import Link from "next/link";

import styles from "./AdminSectionNav.module.css";

const links = [
  { href: "/admin", label: "داشبورد" },
  { href: "/admin/listings", label: "آگهی‌ها" },
  { href: "/admin/businesses", label: "کسب‌وکارها" },
  { href: "/admin/commerce", label: "Commerce" },
  { href: "/admin/orders", label: "سفارش‌ها" },
  { href: "/admin/payments", label: "پرداخت‌ها" },
  { href: "/admin/invoices", label: "فاکتورها" },
  { href: "/admin/refunds", label: "بازپرداخت" },
  { href: "/admin/subscriptions", label: "اشتراک‌ها" },
  { href: "/admin/pricing", label: "تعرفه‌ها" },
  { href: "/", label: "مشاهده سایت" },
];

export default function AdminSectionNav() {
  return (
    <nav className={styles.navigation} aria-label="منوی مدیریت چاکود">
      <div className={styles.inner}>
        {links.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
      </div>
    </nav>
  );
}
