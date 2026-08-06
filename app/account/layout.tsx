import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./account-layout.module.css";

type AccountLayoutProps = {
  children: ReactNode;
};

const accountLinks = [
  { href: "/account", label: "حساب من" },
  { href: "/dashboard", label: "داشبورد" },
  { href: "/account/listings", label: "آگهی‌های من" },
  { href: "/account/saved", label: "ذخیره‌شده‌ها" },
  { href: "/account/wallet", label: "کیف پول" },
  { href: "/account/payments", label: "پرداخت‌ها" },
  { href: "/account/invoices", label: "فاکتورها" },
  { href: "/account/promotions", label: "تبلیغات" },
  { href: "/account/subscriptions", label: "اشتراک‌ها" },
  { href: "/account/ads", label: "رزرو بنر" },
];

export default function AccountLayout({ children }: AccountLayoutProps) {
  return (
    <div className={styles.layout} dir="rtl">
      <div className={styles.navigationShell}>
        <nav className={styles.navigation} aria-label="دسترسی‌های حساب کاربری">
          {accountLinks.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navigationLink}>
              {item.label}
            </Link>
          ))}
          <Link href="/account/listings/new" className={styles.primaryLink}>
            ثبت آگهی
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
