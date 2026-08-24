"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import styles from "./AdminShell.module.css";

type NavItem = { href: string; title: string; icon: string; badge?: string };

const groups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "مدیریت اصلی",
    items: [
      { href: "/admin", title: "داشبورد", icon: "▦" },
      { href: "/admin/listings", title: "مدیریت آگهی‌ها", icon: "☷" },
    ],
  },
  {
    title: "تجارت و درآمد",
    items: [
      { href: "/admin/business", title: "مرکز تجارت", icon: "◇" },
      { href: "/admin/business/packages", title: "پکیج‌ها و خدمات", icon: "□" },
      { href: "/admin/business/pricing", title: "قوانین قیمت‌گذاری", icon: "٪" },
      { href: "/admin/business/commissions", title: "تخفیف و معرف‌ها", icon: "◉" },
    ],
  },
  {
    title: "عملیات مالی",
    items: [
      { href: "/admin/business/orders", title: "سفارش‌ها", icon: "≡" },
      { href: "/admin/business/payments", title: "پرداخت‌ها", icon: "▤" },
      { href: "/admin/business/refunds", title: "بازگشت وجه", icon: "↶" },
    ],
  },
  {
    title: "تنظیمات و نظارت",
    items: [
      {
        href: "/admin/settings/golden-opportunity",
        title: "فرصت طلایی",
        icon: "★",
        badge: "ویژه",
      },
      { href: "/admin/business/audit-log", title: "گزارش تغییرات", icon: "⌁" },
    ],
  },
];

const allItems = groups.flatMap((group) => group.items);

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/admin/business") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const currentItem = useMemo(
    () =>
      [...allItems]
        .sort((a, b) => b.href.length - a.href.length)
        .find((item) => isActive(pathname, item.href)),
    [pathname]
  );

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className={`${styles.shell} ${compact ? styles.compact : ""}`} dir="rtl">
      <button
        type="button"
        className={`${styles.backdrop} ${drawerOpen ? styles.backdropVisible : ""}`}
        aria-label="بستن منوی مدیریت"
        onClick={() => setDrawerOpen(false)}
      />

      <aside className={`${styles.sidebar} ${drawerOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brandRow}>
          <Link className={styles.brand} href="/admin" onClick={() => setDrawerOpen(false)}>
            <span className={styles.brandMark}>چ</span>
            <span className={styles.brandCopy}>
              <strong>چاکود</strong>
              <small>مرکز مدیریت</small>
            </span>
          </Link>
          <button
            type="button"
            className={styles.closeDrawer}
            aria-label="بستن منو"
            onClick={() => setDrawerOpen(false)}
          >
            ×
          </button>
        </div>

        <div className={styles.workspace}>
          <span className={styles.workspaceMark}>C</span>
          <span className={styles.workspaceCopy}>
            <small>فضای کاری فعال</small>
            <strong>مدیریت مرکزی چاکود</strong>
          </span>
          <span className={styles.chevron}>⌄</span>
        </div>

        <nav className={styles.navigation} aria-label="منوی اصلی مدیریت">
          {groups.map((group) => (
            <section className={styles.navGroup} key={group.title}>
              <strong className={styles.groupTitle}>{group.title}</strong>
              <div className={styles.groupItems}>
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      className={`${styles.navLink} ${active ? styles.active : ""}`}
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      aria-current={active ? "page" : undefined}
                      title={compact ? item.title : undefined}
                    >
                      <span className={styles.navIcon}>{item.icon}</span>
                      <span className={styles.navTitle}>{item.title}</span>
                      {item.badge ? <span className={styles.navBadge}>{item.badge}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.siteLink}>
            <span className={styles.navIcon}>↗</span>
            <span className={styles.navTitle}>مشاهده سایت</span>
          </Link>
          <button
            type="button"
            className={styles.collapseButton}
            onClick={() => setCompact((value) => !value)}
            aria-label={compact ? "باز کردن منو" : "جمع کردن منو"}
          >
            <span className={styles.navIcon}>{compact ? "‹" : "›"}</span>
            <span className={styles.navTitle}>جمع‌کردن منو</span>
          </button>
        </div>
      </aside>

      <section className={styles.contentColumn}>
        <header className={styles.topbar}>
          <div className={styles.topbarStart}>
            <button
              type="button"
              className={styles.menuButton}
              aria-label="باز کردن منوی مدیریت"
              onClick={() => setDrawerOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
            <div className={styles.pageIdentity}>
              <small>پنل مدیریت</small>
              <strong>{currentItem?.title || "مدیریت چاکود"}</strong>
            </div>
          </div>
          <div className={styles.topbarActions}>
            <span className={styles.systemStatus}><i /> سامانه فعال</span>
            <Link className={styles.quickSiteLink} href="/">بازگشت به سایت</Link>
            <div className={styles.avatar} aria-label="حساب مدیر">م</div>
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </section>
    </div>
  );
}
