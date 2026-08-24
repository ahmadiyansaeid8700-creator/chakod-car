"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "./AdminShell.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  permissions?: string[];
};

export type AdminShellAccess = {
  role: string;
  permissions: string[];
  isSiteOwner: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navigation: NavGroup[] = [
  {
    label: "مرکز مدیریت",
    items: [
      { href: "/admin", label: "نمای کلی", icon: "grid", exact: true },
      { href: "/admin/listings", label: "آگهی‌ها", icon: "car", permissions: ["listings.view", "listings.manage"] },
      { href: "/admin/businesses", label: "کسب‌وکارها", icon: "store", permissions: ["businesses.view", "businesses.manage"] },
      { href: "/admin/business-verifications", label: "تأیید مدارک", icon: "verify", permissions: ["businesses.manage", "verifications.manage"] },
      { href: "/admin/users", label: "کاربران", icon: "users", permissions: ["users.view", "users.manage"] },
      { href: "/admin/support", label: "پشتیبانی", icon: "support", permissions: ["support.view", "support.manage"] },
    ],
  },
  {
    label: "محتوا و رشد",
    items: [
      { href: "/admin/articles", label: "مقالات", icon: "article", permissions: ["content.view", "content.manage", "articles.manage"] },
      { href: "/admin/stories", label: "استوری‌ها", icon: "story", permissions: ["content.manage", "stories.manage"] },
      { href: "/admin/market-floor", label: "کف بازار", icon: "star", permissions: ["listings.manage", "placements.manage"] },
      { href: "/admin/advertising", label: "تبلیغات", icon: "megaphone", permissions: ["banners.view", "banners.manage", "advertising.manage"] },
      { href: "/admin/featured-showrooms", label: "نمایشگاه منتخب", icon: "star", permissions: ["businesses.manage", "placements.manage"] },
      { href: "/admin/placements", label: "جایگاه‌ها", icon: "pin", permissions: ["placements.view", "placements.manage"] },
      { href: "/admin/ambassadors", label: "سفیران", icon: "ambassador", permissions: ["ambassadors.view", "ambassadors.manage"] },
      { href: "/admin/affiliate", label: "همکاری در فروش", icon: "affiliate", permissions: ["affiliate.view", "affiliate.manage"] },
    ],
  },
  {
    label: "مالی و تجاری",
    items: [
      { href: "/admin/commerce", label: "مرکز مالی", icon: "wallet", permissions: ["pricing.view", "orders.view", "payments.view", "subscriptions.view"] },
      { href: "/admin/orders", label: "سفارش‌ها", icon: "orders", permissions: ["orders.view", "orders.manage"] },
      { href: "/admin/payments", label: "پرداخت‌ها", icon: "payment", permissions: ["payments.view", "payments.manage"] },
      { href: "/admin/invoices", label: "فاکتورها", icon: "invoice", permissions: ["payments.view", "invoices.view"] },
      { href: "/admin/refunds", label: "بازپرداخت‌ها", icon: "refund", permissions: ["payments.view", "refunds.manage"] },
      { href: "/admin/subscriptions", label: "اشتراک‌ها", icon: "subscription", permissions: ["subscriptions.view", "subscriptions.manage"] },
      { href: "/admin/pricing", label: "تعرفه‌ها", icon: "pricing", permissions: ["pricing.view", "pricing.manage"] },
    ],
  },
  {
    label: "تنظیمات سامانه",
    items: [
      { href: "/admin/rules", label: "قوانین و قیمت‌ها", icon: "rules", permissions: ["settings.manage", "pricing.manage"] },
      { href: "/admin/locations", label: "موقعیت‌ها", icon: "location", permissions: ["settings.manage", "locations.manage"] },
      { href: "/admin/admins", label: "مدیران", icon: "admin", permissions: ["admins.view", "admins.manage"] },
      { href: "/admin/roles", label: "نقش‌ها", icon: "roles", permissions: ["admins.manage", "roles.manage"] },
      { href: "/admin/audit-logs", label: "گزارش تغییرات", icon: "audit", permissions: ["audit.view"] },
      { href: "/admin/settings", label: "تنظیمات", icon: "settings", permissions: ["settings.manage"] },
    ],
  },
];

function Glyph({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    car: <><path d="M5 17h14l-1.4-5.2A2.5 2.5 0 0 0 15.2 10H8.8a2.5 2.5 0 0 0-2.4 1.8L5 17Z"/><path d="M3 17h18v3H3zM7 20v1m10-1v1M8 14h.01M16 14h.01"/></>,
    store: <><path d="M4 10V5h16v5M5 10v9h14v-9"/><path d="M3 10h18l-2-5H5l-2 5Zm6 9v-5h6v5"/></>,
    verify: <><path d="M12 3 4.5 6v5c0 4.7 3.2 8.5 7.5 10 4.3-1.5 7.5-5.3 7.5-10V6L12 3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
    users: <><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
    support: <><circle cx="12" cy="12" r="9"/><path d="M8.5 9a3.5 3.5 0 1 1 5.7 2.7c-1.2.9-2.2 1.4-2.2 3M12 18h.01"/></>,
    article: <><path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5M8 12h8M8 16h8"/></>,
    story: <><rect x="5" y="2" width="14" height="20" rx="4"/><circle cx="12" cy="11" r="3"/><path d="M9 18h6"/></>,
    megaphone: <><path d="m3 11 15-6v14L3 13v-2Z"/><path d="M6 14v5h4l1-3"/></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    wallet: <><path d="M4 6h15a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13"/><path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  };
  const fallback = <><circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/></>;
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name] || fallback}</svg>;
}

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function canSee(item: NavItem, access: AdminShellAccess) {
  if (item.href === "/admin") return true;
  if (access.isSiteOwner || ["site_owner", "super_admin"].includes(access.role)) return true;
  if (access.permissions.includes("*")) return true;
  return (item.permissions || []).some((permission) => access.permissions.includes(permission));
}

export default function AdminShell({ children, access }: { children: React.ReactNode; access: AdminShellAccess }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const visibleNavigation = navigation
    .map((group) => ({ ...group, items: group.items.filter((item) => canSee(item, access)) }))
    .filter((group) => group.items.length > 0);
  const currentItem = navigation.flatMap((group) => group.items).find((item) => isActive(pathname, item));
  const routeAllowed = !currentItem || canSee(currentItem, access);

  return (
    <div className={`${styles.shell} ${compact ? styles.compact : ""}`} dir="rtl">
      <button className={`${styles.scrim} ${open ? styles.scrimOpen : ""}`} type="button" aria-label="بستن منوی مدیریت" onClick={() => setOpen(false)} />
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <Link href="/admin" aria-label="داشبورد مدیریت چاکود">
            <span className={styles.brandMark}>چ</span>
            <span className={styles.brandText}><strong>چاکود</strong><small>مرکز مدیریت</small></span>
          </Link>
          <button type="button" className={styles.collapse} onClick={() => setCompact((value) => !value)} aria-label={compact ? "باز کردن منو" : "جمع کردن منو"}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>

        <nav className={styles.nav} aria-label="منوی اصلی مدیریت">
          {visibleNavigation.map((group) => (
            <section key={group.label} className={styles.navGroup}>
              <h2>{group.label}</h2>
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <Link key={item.href} href={item.href} className={active ? styles.active : ""} aria-current={active ? "page" : undefined} title={compact ? item.label : undefined}>
                    <span className={styles.icon}><Glyph name={item.icon} /></span>
                    <span className={styles.linkLabel}>{item.label}</span>
                  </Link>
                );
              })}
            </section>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/" title={compact ? "مشاهده سایت" : undefined}>
            <span className={styles.icon}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h12M12 6l6 6-6 6"/><path d="M20 4v16"/></svg></span>
            <span className={styles.linkLabel}>مشاهده سایت</span>
          </Link>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <button className={styles.menuButton} type="button" aria-label="باز کردن منوی مدیریت" aria-expanded={open} onClick={() => setOpen(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          </button>
          <div className={styles.topbarTitle}><strong>مرکز مدیریت چاکود</strong><span>کنترل یکپارچه پلتفرم</span></div>
          <div className={styles.topbarActions}>
            {canSee({ href: "/admin/support", label: "پشتیبانی", icon: "support", permissions: ["support.view", "support.manage"] }, access) && (
              <Link href="/admin/support" aria-label="درخواست‌های پشتیبانی"><Glyph name="support" /></Link>
            )}
            <Link className={styles.siteButton} href="/">مشاهده سایت</Link>
          </div>
        </header>
        <div className={styles.content}>{routeAllowed ? children : (
          <main className={styles.denied}>
            <span>دسترسی محدود</span>
            <h1>این بخش برای نقش شما فعال نیست</h1>
            <p>اطلاعات حساس این صفحه نمایش داده نشد. مدیر کل می‌تواند مجوز لازم را از بخش مدیران تنظیم کند.</p>
            <Link href="/admin">بازگشت به نمای کلی</Link>
          </main>
        )}</div>
      </div>
    </div>
  );
}
