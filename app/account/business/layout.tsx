import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./business-layout.module.css";

const businessLinks = [
  { href: "/account/business", label: "مرکز فرمان" },
  { href: "/account/business/edit", label: "اطلاعات مجموعه" },
  { href: "/account/business/media", label: "رسانه‌ها" },
  { href: "/account/business/portfolio", label: "نمونه‌کار" },
  { href: "/account/business/hours", label: "ساعات کاری" },
  { href: "/account/business/branches", label: "شعبه‌ها" },
  { href: "/account/business/team", label: "تیم" },
  { href: "/account/business/analytics", label: "تحلیل" },
  { href: "/account/business/promotions", label: "تبلیغات" },
  { href: "/account/business/billing", label: "مالی" },
];

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.layout} dir="rtl">
      <nav className={styles.navigation} aria-label="بخش‌های پنل کسب‌وکار">
        {businessLinks.map((item) => (
          <Link key={item.href} href={item.href}>{item.label}</Link>
        ))}
        <Link className={styles.publicLink} href="/businesses">نمایش عمومی</Link>
      </nav>
      {children}
    </div>
  );
}
