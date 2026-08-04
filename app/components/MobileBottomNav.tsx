"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./MobileBottomNav.module.css";

type NavItem = {
  id: string;
  title: string;
  href: string;
  icon: ReactNode;
  primary?: boolean;
  isActive: (pathname: string) => boolean;
};

type CachedUser = {
  account_type?: "personal" | "dealer" | "business";
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
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path
        d="M3.5 10.7 12 3.8l8.5 6.9v8a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8v-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9.2 20.5v-6.2h5.6v6.2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function MarketIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path
        d="M4.2 10.2h15.6l-1.1-4.1a1.8 1.8 0 0 0-1.7-1.3H7a1.8 1.8 0 0 0-1.7 1.3l-1.1 4.1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M5.3 10.2v7.2c0 1 .8 1.8 1.8 1.8h9.8c1 0 1.8-.8 1.8-1.8v-7.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 19.2v-4.5h8v4.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function SubmitIcon() {
  return (
    <svg viewBox="0 0 24 24" width="27" height="27" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path d="M7.2 4.5h9.6a2 2 0 0 1 2 2v2.1a2 2 0 0 1-2 2H7.2a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.2 13.9h3.1a2 2 0 0 1 2 2v1.6a2 2 0 0 1-2 2H7.2a2 2 0 0 1-2-2v-1.6a2 2 0 0 1 2-2ZM15.6 13.9h1.2a2 2 0 0 1 2 2v1.6a2 2 0 0 1-2 2h-1.2a2 2 0 0 1-2-2v-1.6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20c.6-4 3.1-6 7-6s6.4 2 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
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
  const user = readJson<CachedUser>("chakod_user");
  const identity = readJson<CachedIdentity>("chakod_identity") || {};
  const loggedIn = Boolean(localStorage.getItem("chakod_session_token") && user);

  if (!loggedIn) {
    return { href: "/login", title: "ورود" };
  }

  const hasAdminAccess =
    Boolean(identity.is_site_owner) ||
    [identity.primary_role, ...(identity.roles || [])].some(
      (role) => role && ADMIN_ROLES.has(role),
    );

  if (hasAdminAccess) {
    return {
      href: safePath(identity.redirect_to) ? identity.redirect_to! : "/admin",
      title: "مدیریت",
    };
  }

  if (user?.account_type === "dealer" || user?.account_type === "business") {
    return { href: "/dashboard", title: "نمایشگاه" };
  }

  return { href: "/account", title: "حساب" };
}

export default function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const [accountDestination, setAccountDestination] = useState({
    href: "/login",
    title: "ورود",
  });

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

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        id: "home",
        title: "خانه",
        href: "/",
        icon: <HomeIcon />,
        isActive: (currentPath) => currentPath === "/",
      },
      {
        id: "market",
        title: "بازار",
        href: "/cars",
        icon: <MarketIcon />,
        isActive: (currentPath) => currentPath === "/cars" || currentPath.startsWith("/cars/"),
      },
      {
        id: "submit",
        title: "ثبت آگهی",
        href: "/account/listings/new",
        icon: <SubmitIcon />,
        primary: true,
        isActive: (currentPath) => currentPath === "/account/listings/new",
      },
      {
        id: "services",
        title: "خدمات",
        href: "/businesses?type=car_service",
        icon: <ServicesIcon />,
        isActive: (currentPath) => currentPath.startsWith("/businesses"),
      },
      {
        id: "account",
        title: accountDestination.title,
        href: accountDestination.href,
        icon: <AccountIcon />,
        isActive: (currentPath) => {
          if (accountDestination.href === "/admin") return currentPath.startsWith("/admin");
          if (accountDestination.href === "/dashboard") return currentPath.startsWith("/dashboard");
          if (accountDestination.href === "/login") return currentPath.startsWith("/login");

          return currentPath === "/account" || currentPath.startsWith("/account/");
        },
      },
    ],
    [accountDestination],
  );

  const shouldHide =
    pathname.startsWith("/admin") || pathname.startsWith("/super-admin");

  if (shouldHide) return null;

  return (
    <>
      <div className={styles.pageSpacer} aria-hidden="true" />

      <div className={styles.navigationShell}>
        <nav className={styles.navigation} aria-label="منوی اصلی نسخه موبایل">
          {navItems.map((item) => {
            const active = item.isActive(pathname);

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-label={item.title}
                aria-current={active ? "page" : undefined}
                className={[
                  styles.navigationItem,
                  item.primary ? styles.primaryItem : "",
                  active ? styles.activeItem : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
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
