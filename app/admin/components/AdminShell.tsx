"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const items = [
  { href: "/admin", title: "داشبورد" },
  { href: "/admin/listings", title: "آگهی‌ها" },
  { href: "/admin/business", title: "تجارت و قیمت‌گذاری" },
  { href: "/admin/settings", title: "تنظیمات سیستم" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="adminShell" dir="rtl">
      <aside className="adminSidebar">
        <h2>چاکود</h2>
        <p>مدیریت مرکزی</p>
        <nav>
          {items.map((item) => (
            <Link key={item.href} href={item.href}>{item.title}</Link>
          ))}
        </nav>
      </aside>
      <section className="adminContent">
        <header className="adminTopbar">پنل مدیریت</header>
        {children}
      </section>
    </div>
  );
}
