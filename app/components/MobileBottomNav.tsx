"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CreateActionMenu from "./CreateActionMenu";
import MobileAccountSwitcher from "./MobileAccountSwitcher";
import styles from "./MobileBottomNav.module.css";

type NavItem = {
  id: string;
  title: string;
  href: string;
  icon: ReactNode;
  primary?: boolean;
  isActive: (pathname: string) => boolean;
};

type CachedIdentity = {
  redirect_to?: string;
  primary_role?: string;
  roles?: string[];
  is_site_owner?: boolean;
};

const ADMIN_ROLES = new Set([
  "site_owner",
  "super_admin",
  "admin",
  "moderator",
  "support",
  "finance",
  "viewer",
]);

function HomeIcon() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M3.5 10.7 12 3.8l8.5 6.9v8a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8v-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9.2 20.5v-6.2h5.6v6.2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>;
}
function ShowcaseIcon() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M12 3.4 14 8l4.9.5-3.7 3.3 1.1 4.8L12 14.1l-4.3 2.5 1.1-4.8-3.7-3.3L10 8l2-4.6Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/><path d="M18.5 4.6v3.2M20.1 6.2h-3.2M5.4 16.7v2.7M6.8 18.05H4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}
function SubmitIcon() {
  return <svg viewBox="0 0 24 24" width="27" height="27" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>;
}
function ServicesIcon() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M7.2 4.5h9.6a2 2 0 0 1 2 2v2.1a2 2 0 0 1-2 2H7.2a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8"/><path d="M7.2 13.9h3.1a2 2 0 0 1 2 2v1.6a2 2 0 0 1-2 2H7.2a2 2 0 0 1-2-2v-1.6a2 2 0 0 1 2-2ZM15.6 13.9h1.2a2 2 0 0 1 2 2v1.6a2 2 0 0 1-2 2h-1.2a2 2 0 0 1-2-2v-1.6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8"/></svg>;
}
function AccountIcon() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8"/><path d="M5 20c.6-4 3.1-6 7-6s6.4 2 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}

function safePath(value?: string) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function resolveAccountDestination() {
  const identity = readJson<CachedIdentity>("chakod_identity") || {};
  const loggedIn = Boolean(localStorage.getItem("chakod_session_token") || localStorage.getItem("chakod_user"));

  if (!loggedIn) return { href: "/login", title: "ورود", switcher: false };

  const hasAdminAccess = Boolean(identity.is_site_owner) ||
    [identity.primary_role, ...(identity.roles || [])].some((role) => role && ADMIN_ROLES.has(role));

  if (hasAdminAccess) {
    return {
      href: safePath(identity.redirect_to) ? identity.redirect_to! : "/admin",
      title: "مدیریت",
      switcher: false,
    };
  }

  return { href: "/account-v2/profile", title: "حساب", switcher: true };
}

export default function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const [accountDestination, setAccountDestination] = useState({ href: "/login", title: "ورود", switcher: false });

  useEffect(() => {
    const syncDestination = () => setAccountDestination(resolveAccountDestination());
    syncDestination();
    window.addEventListener("storage", syncDestination);
    window.addEventListener("chakod:auth-changed", syncDestination);
    return () => {
      window.removeEventListener("storage", syncDestination);
      window.removeEventListener("chakod:auth-changed", syncDestination);
    };
  }, []);

  const navItems = useMemo<NavItem[]>(() => [
    { id: "home", title: "خانه", href: "/", icon: <HomeIcon />, isActive: (p) => p === "/" },
    { id: "showcase", title: "ویترین من", href: "/account/showcase", icon: <ShowcaseIcon />, isActive: (p) => p === "/account/showcase" || p.startsWith("/account/showcase/") },
    {
      id: "submit",
      title: "ثبت آگهی",
      href: "/account/listings/new",
      icon: <SubmitIcon />,
      primary: true,
      isActive: (p) =>
        p === "/account/listings/new" ||
        p.startsWith("/advertising/stories") ||
        p.startsWith("/advertising/selected"),
    },
    { id: "services", title: "خدمات", href: "/businesses?type=car_service", icon: <ServicesIcon />, isActive: (p) => p.startsWith("/businesses") },
    {
      id: "account",
      title: accountDestination.title,
      href: accountDestination.href,
      icon: <AccountIcon />,
      isActive: (p) => {
        if (accountDestination.href === "/admin") return p.startsWith("/admin");
        if (accountDestination.href === "/login") return p.startsWith("/login");
        if (p === "/account/showcase" || p.startsWith("/account/showcase/")) return false;
        return p === "/account" || p.startsWith("/account/") || p.startsWith("/account-v2/");
      },
    },
  ], [accountDestination]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/super-admin")) return null;

  return (
    <>
      <div className={styles.pageSpacer} aria-hidden="true" />
      <div className={styles.navigationShell}>
        <nav className={styles.navigation} aria-label="منوی اصلی نسخه موبایل">
          {navItems.map((item) => {
            const active = item.isActive(pathname);
            const className = [styles.navigationItem, item.primary ? styles.primaryItem : "", active ? styles.activeItem : ""].filter(Boolean).join(" ");

            if (item.id === "submit") {
              return (
                <CreateActionMenu
                  key={item.id}
                  triggerClassName={className}
                  iconClassName={styles.primaryIcon}
                  titleClassName={styles.primaryTitle}
                  icon={item.icon}
                />
              );
            }

            if (item.id === "account" && accountDestination.switcher) {
              return <div key={item.id} className={className}><MobileAccountSwitcher />{!item.primary && <span className={styles.activeIndicator} aria-hidden="true" />}</div>;
            }

            return (
              <Link key={item.id} href={item.href} aria-label={item.title} aria-current={active ? "page" : undefined} className={className}>
                <span className={item.primary ? styles.primaryIcon : styles.navigationIcon}>{item.icon}</span>
                <span className={item.primary ? styles.primaryTitle : styles.navigationTitle}>{item.title}</span>
                {!item.primary && <span className={styles.activeIndicator} aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
