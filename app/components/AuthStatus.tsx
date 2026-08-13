"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = "https://api.chakod.com";

type ChakodUser = {
  id?: number;
  display_name?: string;
  full_name?: string | null;
  business_name?: string | null;
  mobile?: string;
  mobile_masked?: string;
  account_type?: "personal" | "dealer" | "business";
};

type IdentityCache = {
  primary_role?: string;
  role_title?: string;
  redirect_to?: string;
  roles?: string[];
  permissions?: string[];
  is_site_owner?: boolean;
};

type MeResponse = IdentityCache & {
  success?: boolean;
  logged_in?: boolean;
  message?: string;
  user?: ChakodUser | null;
};

type AccountActivity = {
  id: number;
  type: string;
  name: string;
  external_dealer_id?: number | null;
};

type ActivitiesResponse = {
  success?: boolean;
  activities?: AccountActivity[];
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? {
        Authorization: `Bearer ${token}`,
        "X-Session-Token": token,
      }
    : {};
}

function readSavedUser(): ChakodUser | null {
  try {
    const saved = localStorage.getItem("chakod_user");
    return saved ? (JSON.parse(saved) as ChakodUser) : null;
  } catch {
    return null;
  }
}

function readSavedIdentity(): IdentityCache {
  try {
    const saved = localStorage.getItem("chakod_identity");
    return saved ? (JSON.parse(saved) as IdentityCache) : {};
  } catch {
    return {};
  }
}

function clearLocalAuth() {
  localStorage.removeItem("chakod_session_token");
  localStorage.removeItem("chakod_user");
  localStorage.removeItem("chakod_identity");
}

function activityLabel(type: string) {
  if (type === "dealer") return "نمایشگاه خودرو";
  if (type === "parts_store") return "فروشگاه قطعات";
  if (type === "repair_shop") return "تعمیرگاه خودرو";
  if (type === "car_service") return "مرکز خدمات خودرو";
  return "کسب‌وکار";
}

function activityManageHref(activity: AccountActivity) {
  if (activity.type === "dealer" && activity.external_dealer_id) {
    return `/account/business?dealer_id=${activity.external_dealer_id}`;
  }
  return `/account-v2/businesses/${activity.id}`;
}

function UserAvatarIcon({ crowned = false }: { crowned?: boolean }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="23"
      height="23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {crowned ? (
        <path
          d="M10.3 8.6 12.8 5l3.2 3.2L19.2 5l2.5 3.6-.9 3.2h-9.6l-.9-3.2Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      ) : null}
      <circle cx="16" cy={crowned ? "16" : "12.8"} r="4.2" stroke="currentColor" strokeWidth="2" />
      <path
        d={
          crowned
            ? "M8.7 27c.7-4.5 3.5-7 7.3-7s6.6 2.5 7.3 7"
            : "M8.2 26c.7-5.1 3.7-8.2 7.8-8.2s7.1 3.1 7.8 8.2"
        }
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AuthStatus() {
  const [user, setUser] = useState<ChakodUser | null>(null);
  const [, setIdentity] = useState<IdentityCache>({});
  const [activities, setActivities] = useState<AccountActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [businessesLoaded, setBusinessesLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const loadUser = useCallback(async () => {
    const cachedUser = readSavedUser();
    const cachedIdentity = readSavedIdentity();

    if (cachedUser) setUser(cachedUser);
    setIdentity(cachedIdentity);

    try {
      const res = await fetch(`${API_BASE}/api/me.php`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...authHeaders(),
        },
        credentials: "include",
        cache: "no-store",
      });

      const json = (await res.json()) as MeResponse;

      if (res.ok && json.success && json.logged_in && json.user) {
        const nextIdentity: IdentityCache = {
          primary_role: json.primary_role,
          role_title: json.role_title,
          redirect_to: json.redirect_to,
          roles: json.roles || [],
          permissions: json.permissions || [],
          is_site_owner: json.is_site_owner,
        };

        setUser(json.user);
        setIdentity(nextIdentity);
        localStorage.setItem("chakod_user", JSON.stringify(json.user));
        localStorage.setItem("chakod_identity", JSON.stringify(nextIdentity));
        return;
      }

      if (json.success && json.logged_in === false) {
        clearLocalAuth();
        setUser(null);
        setIdentity({});
        setActivities([]);
        setBusinessesLoaded(false);
      }
    } catch {
      // هنگام قطع موقت API، اطلاعات محلی برای حفظ تجربه کاربر باقی می‌ماند.
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBusinesses = useCallback(async () => {
    if (businessesLoading) return;
    setBusinessesLoading(true);

    try {
      const res = await fetch("/api/auth/account-activities", {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...authHeaders(),
        },
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as ActivitiesResponse;
      if (res.ok && json.success) {
        setActivities(Array.isArray(json.activities) ? json.activities : []);
      }
    } catch {
      // منوی حساب باید حتی در قطع موقت این API قابل استفاده بماند.
    } finally {
      setBusinessesLoaded(true);
      setBusinessesLoading(false);
    }
  }, [businessesLoading]);

  useEffect(() => {
    void loadUser();

    const handleAuthChange = () => {
      setLoading(true);
      setMenuOpen(false);
      setActivities([]);
      setBusinessesLoaded(false);
      void loadUser();
    };

    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("chakod:auth-changed", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("chakod:auth-changed", handleAuthChange);
    };
  }, [loadUser]);

  useEffect(() => {
    if (!menuOpen) return;
    if (!businessesLoaded) void loadBusinesses();

    const handlePointerDown = (event: PointerEvent) => {
      if (
        shellRef.current &&
        event.target instanceof Node &&
        !shellRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, businessesLoaded, loadBusinesses]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch(`${API_BASE}/api/logout.php`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({}),
      });
    } catch {
      // پاک‌سازی محلی انجام می‌شود؛ نشست سرور در ورود بعدی دوباره بررسی خواهد شد.
    } finally {
      clearLocalAuth();
      setUser(null);
      setIdentity({});
      setActivities([]);
      setBusinessesLoaded(false);
      setMenuOpen(false);
      setLoggingOut(false);
      window.dispatchEvent(new Event("chakod:auth-changed"));
      window.location.assign("/");
    }
  }

  if (loading && !user) {
    return (
      <div className="authStatus authStatusLoading" aria-live="polite">
        <div className="authAvatar"><UserAvatarIcon /></div>
        <div className="authStatusText">
          <strong>در حال بررسی...</strong>
          <span>وضعیت ورود</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Link className="authStatus authStatusGuest" href="/login">
        <div className="authStatusText">
          <strong>ورود</strong>
          <span>حساب چاکود</span>
        </div>
      </Link>
    );
  }

  const displayName =
    user.display_name?.trim() ||
    user.business_name?.trim() ||
    user.full_name?.trim() ||
    "همراه چاکود";

  return (
    <div className="authStatusShell" ref={shellRef}>
      <button
        type="button"
        className="authStatus authStatusUser"
        onClick={() => setMenuOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <div className="authAvatar" aria-hidden="true">
          <UserAvatarIcon crowned />
        </div>
        <div className="authStatusText">
          <strong>{displayName}</strong>
          <span>حساب کاربری</span>
        </div>
        <span className="authMenuChevron" aria-hidden="true">⌄</span>
      </button>

      {menuOpen ? (
        <div className="authMenu" role="menu">
          <Link className="authMenuRow" role="menuitem" href="/account-v2" onClick={() => setMenuOpen(false)}>
            <span className="authMenuIcon" aria-hidden="true">♙</span>
            <span className="authMenuItemCopy">
              <strong>حساب شخصی</strong>
              <small>{displayName}</small>
            </span>
          </Link>

          {businessesLoading && activities.length === 0 ? (
            <div className="authMenuLoading">در حال دریافت کسب‌وکارها…</div>
          ) : null}

          {activities.map((activity) => (
            <Link
              className="authMenuRow"
              role="menuitem"
              key={activity.id}
              href={activityManageHref(activity)}
              onClick={() => setMenuOpen(false)}
            >
              <span className="authMenuIcon" aria-hidden="true">▣</span>
              <span className="authMenuItemCopy">
                <strong>{activity.name}</strong>
                <small>{activityLabel(activity.type)}</small>
              </span>
            </Link>
          ))}

          <Link className="authMenuRow authMenuAdd" role="menuitem" href="/account-v2/businesses/new" onClick={() => setMenuOpen(false)}>
            <span className="authMenuIcon" aria-hidden="true">＋</span>
            <span className="authMenuItemCopy"><strong>افزودن کسب‌وکار</strong></span>
          </Link>

          <button className="authMenuRow authMenuLogout" type="button" role="menuitem" onClick={() => void logout()}>
            <span className="authMenuIcon" aria-hidden="true">↪</span>
            <span className="authMenuItemCopy"><strong>{loggingOut ? "در حال خروج..." : "خروج از حساب"}</strong></span>
          </button>
        </div>
      ) : null}

      <style>{`
        .authStatusShell {
          position: relative;
          flex: 0 0 auto;
        }

        .authStatusShell .authStatus {
          font-family: inherit;
          cursor: pointer;
        }

        .authStatusShell button.authStatus {
          text-align: right;
        }

        .authStatusShell .authAvatar svg {
          display: block;
          width: 23px;
          height: 23px;
        }

        .authMenuChevron {
          margin-right: auto;
          color: #7c3aed;
          font-size: 12px;
          transition: transform 160ms ease;
        }

        .authStatus[aria-expanded="true"] .authMenuChevron {
          transform: rotate(180deg);
        }

        .authMenu {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          z-index: 180;
          width: 250px;
          max-height: min(520px, calc(100vh - 96px));
          overflow-y: auto;
          padding: 8px;
          border: 1px solid #e8def5;
          border-radius: 18px;
          color: #211633;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 24px 65px rgba(39, 20, 62, 0.2);
          backdrop-filter: blur(18px);
        }

        .authMenuRow {
          width: 100%;
          min-height: 47px;
          padding: 5px 9px;
          border: 0;
          border-radius: 11px;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #493a55;
          background: transparent;
          font-family: inherit;
          text-align: right;
          text-decoration: none;
          cursor: pointer;
        }

        .authMenuRow:hover,
        .authMenuRow:focus-visible {
          color: #5b21b6;
          background: #f5f0ff;
          outline: 0;
        }

        .authMenuIcon {
          flex: 0 0 29px;
          width: 29px;
          height: 29px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          color: #6d28d9;
          background: #f2ebff;
          font-size: 14px;
        }

        .authMenuItemCopy {
          min-width: 0;
          display: block;
          flex: 1 1 auto;
        }

        .authMenuItemCopy strong,
        .authMenuItemCopy small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .authMenuItemCopy strong {
          font-size: 10.5px;
          font-weight: 900;
        }

        .authMenuItemCopy small {
          margin-top: 2px;
          color: #8b7d95;
          font-size: 8.5px;
          font-weight: 700;
        }

        .authMenuLoading {
          padding: 9px 12px;
          color: #8b7d95;
          font-size: 9px;
        }

        .authMenuAdd {
          margin-top: 6px;
          border-top: 1px solid #eee7f6;
          border-radius: 0;
          color: #6422b8;
        }

        .authMenuLogout {
          margin-top: 3px;
          border-top: 1px solid #f1e9f7;
          border-radius: 0 0 11px 11px;
          color: #b42318;
        }

        .authMenuLogout .authMenuIcon {
          color: #b42318;
          background: #fff1f0;
        }

        @media (max-width: 640px) {
          .authMenu {
            position: fixed;
            top: 70px;
            right: 10px;
            left: 10px;
            width: auto;
          }

          .authMenuChevron,
          .authStatusText {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
