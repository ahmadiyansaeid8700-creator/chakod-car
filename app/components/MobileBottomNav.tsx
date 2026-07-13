"use client";

import type { ReactNode } from "react";
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

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 10.7 12 3.8l8.5 6.9v8a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8v-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 20.5v-6.2h5.6v6.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MarketIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.2 10.2h15.6l-1.1-4.1a1.8 1.8 0 0 0-1.7-1.3H7a1.8 1.8 0 0 0-1.7 1.3l-1.1 4.1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M5.3 10.2v7.2c0 1 .8 1.8 1.8 1.8h9.8c1 0 1.8-.8 1.8-1.8v-7.2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 19.2v-4.5h8v4.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SubmitIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="27"
      height="27"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.5 5.2c0-1 .8-1.7 1.7-1.7h7.6c1 0 1.7.8 1.7 1.7v15.3L12 17.1l-5.5 3.4V5.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 20c.6-4 3.1-6 7-6s6.4 2 7 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const navItems: NavItem[] = [
  {
    id: "home",
    title: "خانه",
    href: "/",
    icon: <HomeIcon />,
    isActive: (pathname) => pathname === "/",
  },
  {
    id: "market",
    title: "بازار",
    href: "/ads",
    icon: <MarketIcon />,
    isActive: (pathname) =>
      pathname === "/ads" || pathname.startsWith("/ads/"),
  },
  {
    id: "submit",
    title: "ثبت آگهی",
    href: "/submit",
    icon: <SubmitIcon />,
    primary: true,
    isActive: (pathname) =>
      pathname === "/submit" || pathname.startsWith("/submit/"),
  },
  {
    id: "saved",
    title: "نشان‌شده‌ها",
    href: "/account/saved",
    icon: <BookmarkIcon />,
    isActive: (pathname) =>
      pathname === "/account/saved" ||
      pathname.startsWith("/account/saved/"),
  },
  {
    id: "account",
    title: "حساب",
    href: "/account",
    icon: <AccountIcon />,
    isActive: (pathname) => {
      const isAccountRoute =
        pathname === "/account" || pathname.startsWith("/account/");

      const isSavedRoute =
        pathname === "/account/saved" ||
        pathname.startsWith("/account/saved/");

      return isAccountRoute && !isSavedRoute;
    },
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname() || "/";

  const shouldHide =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin");

  if (shouldHide) {
    return null;
  }

  return (
    <>
      <div className={styles.pageSpacer} aria-hidden="true" />

      <div className={styles.navigationShell}>
        <nav
          className={styles.navigation}
          aria-label="منوی اصلی نسخه موبایل"
        >
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
                <span
                  className={
                    item.primary
                      ? styles.primaryIcon
                      : styles.navigationIcon
                  }
                >
                  {item.icon}
                </span>

                <span
                  className={
                    item.primary
                      ? styles.primaryTitle
                      : styles.navigationTitle
                  }
                >
                  {item.title}
                </span>

                {!item.primary && (
                  <span
                    className={styles.activeIndicator}
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}