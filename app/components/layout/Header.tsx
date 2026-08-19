"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "./Header.module.css";

type AccountDestination = {
  href: string;
  label: string;
};

function readAccountDestination(): AccountDestination {
  if (typeof window === "undefined") return { href: "/login", label: "ورود" };

  const token = localStorage.getItem("chakod_session_token") || "";
  if (!token) return { href: "/login", label: "ورود" };

  try {
    const identity = JSON.parse(localStorage.getItem("chakod_identity") || "{}") as {
      is_site_owner?: boolean;
      primary_role?: string;
      roles?: string[];
      redirect_to?: string;
    };
    const adminRoles = new Set(["site_owner", "super_admin", "admin", "moderator", "support", "finance", "viewer"]);
    const roles = [identity.primary_role, ...(identity.roles || [])].filter(Boolean) as string[];
    const hasAdmin = Boolean(identity.is_site_owner) || roles.some((role) => adminRoles.has(role));
    if (hasAdmin) {
      const redirectTo = identity.redirect_to;
      return {
        href: redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/admin",
        label: "مدیریت",
      };
    }
  } catch {
    // اطلاعات محلی ناقص نباید هدر را از کار بیندازد.
  }

  return { href: "/account", label: "حساب من" };
}

export default function Header() {
  const [account, setAccount] = useState<AccountDestination>({ href: "/login", label: "ورود" });

  useEffect(() => {
    const sync = () => setAccount(readAccountDestination());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("chakod:auth-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("chakod:auth-changed", sync);
    };
  }, []);

  return (
    <header className={styles.header} dir="rtl">
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" aria-label="صفحه اصلی چاکود">
          <img src="/brand/chakod-logo-horizontal.png" alt="چاکود" />
        </Link>

        <nav className={styles.nav} aria-label="ناوبری اصلی چاکود">
          <Link href="/cars">خودروها</Link>
          <Link href="/dealerships">نمایشگاه‌ها</Link>
          <Link href="/businesses">کسب‌وکارها</Link>
          <Link href="/cars/price-guide">راهنمای قیمت</Link>
          <Link href="/support">پشتیبانی</Link>
        </nav>

        <div className={styles.actions}>
          <Link className={styles.accountLink} href={account.href}>{account.label}</Link>
          <Link className={styles.primaryAction} href="/account/listings/new">ثبت آگهی</Link>
        </div>
      </div>
    </header>
  );
}
