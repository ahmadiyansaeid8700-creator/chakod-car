"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const groups = [
  {
    title: "مدیریت اصلی",
    items: [
      { href: "/admin", title: "داشبورد" },
      { href: "/admin/listings", title: "آگهی‌ها" },
      { href: "/admin/users", title: "کاربران و نمایشگاه‌ها" },
    ],
  },
  {
    title: "تجارت و درآمد",
    items: [
      { href: "/admin/business", title: "مرکز تجارت" },
      { href: "/admin/business/packages", title: "پکیج‌ها" },
      { href: "/admin/business/pricing", title: "قوانین قیمت‌گذاری" },
      { href: "/admin/business/discounts", title: "تخفیف و معرف‌ها" },
    ],
  },
  {
    title: "مالی",
    items: [
      { href: "/admin/finance/orders", title: "سفارش‌ها" },
      { href: "/admin/finance/payments", title: "پرداخت‌ها" },
      { href: "/admin/finance/refunds", title: "برگشت وجه" },
    ],
  },
  {
    title: "سیستم",
    items: [
      { href: "/admin/golden-opportunity", title: "فرصت طلایی" },
      { href: "/admin/settings", title: "تنظیمات سیستم" },
    ],
  },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="adminShell" dir="rtl">
      <aside className="adminSidebar">
        <h2>چاکود</h2>
        <p>مدیریت مرکزی</p>
        <nav>
          {groups.map((group) => (
            <div key={group.title}>
              <strong>{group.title}</strong>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.title}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <section className="adminContent">
        <header className="adminTopbar">پنل مدیریت چاکود</header>
        {children}
      </section>
    </div>
  );
}
