"use client";

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

const ADMIN_ROLES = new Set([
  "site_owner",
  "super_admin",
  "admin",
  "moderator",
  "support",
  "finance",
  "viewer",
]);

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

function userHasAdminAccess(identity: IdentityCache) {
  if (identity.is_site_owner) return true;

  return [identity.primary_role, ...(identity.roles || [])].some(
    (role) => role && ADMIN_ROLES.has(role),
  );
}

export default function AuthStatus() {
  const [user, setUser] = useState<ChakodUser | null>(null);
  const [identity, setIdentity] = useState<IdentityCache>({});
  const [loading, setLoading] = useState(true);
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
      }
    } catch {
      // هنگام قطع موقت API، اطلاعات محلی برای حفظ تجربه کاربر باقی می‌ماند.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();

    const handleAuthChange = () => {
      setLoading(true);
      setMenuOpen(false);
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
  }, [menuOpen]);

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
      setMenuOpen(false);
      setLoggingOut(false);
      window.dispatchEvent(new Event("chakod:auth-changed"));
      window.location.assign("/");
    }
  }

  if (loading && !user) {
    return (
      <div className="authStatus authStatusLoading" aria-live="polite">
        <div className="authAvatar">چ</div>
        <div className="authStatusText">
          <strong>در حال بررسی...</strong>
          <span>وضعیت ورود</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <a className="authStatus authStatusGuest" href="/login">
        <div className="authAvatar" aria-hidden="true">
          ♕
        </div>
        <div className="authStatusText">
          <strong>ورود / ثبت‌نام</strong>
          <span>حساب چاکود</span>
        </div>
      </a>
    );
  }

  const displayName =
    user.display_name?.trim() ||
    user.business_name?.trim() ||
    user.full_name?.trim() ||
    "همراه چاکود";

  const accountHref =
    user.account_type === "dealer" || user.account_type === "business"
      ? "/dashboard"
      : "/account";

  const hasAdminAccess = userHasAdminAccess(identity);
  const roleTitle = identity.role_title?.trim();

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
          👑
        </div>
        <div className="authStatusText">
          <strong>{displayName}</strong>
          <span>حساب کاربری</span>
        </div>
        <span className="authMenuChevron" aria-hidden="true">
          ⌄
        </span>
      </button>

      {menuOpen ? (
        <div className="authMenu" role="menu">
          <div className="authMenuHead">
            <strong>{displayName}</strong>
            {roleTitle ? <span>{roleTitle}</span> : null}
          </div>

          <a role="menuitem" href={accountHref} onClick={() => setMenuOpen(false)}>
            <span aria-hidden="true">⌂</span>
            {user.account_type === "dealer" || user.account_type === "business"
              ? "داشبورد نمایشگاه"
              : "حساب کاربری"}
          </a>

          <a role="menuitem" href="/account/saved" onClick={() => setMenuOpen(false)}>
            <span aria-hidden="true">♡</span>
            نشان‌شده‌ها
          </a>

          {hasAdminAccess ? (
            <a role="menuitem" href="/admin" onClick={() => setMenuOpen(false)}>
              <span aria-hidden="true">⚙</span>
              پنل مدیریت
            </a>
          ) : null}

          <button type="button" role="menuitem" onClick={() => void logout()}>
            <span aria-hidden="true">↪</span>
            {loggingOut ? "در حال خروج..." : "خروج از حساب"}
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
          width: 230px;
          padding: 8px;
          border: 1px solid #e8def5;
          border-radius: 18px;
          color: #211633;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 24px 65px rgba(39, 20, 62, 0.2);
          backdrop-filter: blur(18px);
        }

        .authMenuHead {
          margin-bottom: 6px;
          padding: 10px 11px 11px;
          border-bottom: 1px solid #eee7f6;
        }

        .authMenuHead strong,
        .authMenuHead span {
          display: block;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .authMenuHead strong {
          font-size: 12px;
        }

        .authMenuHead span {
          margin-top: 4px;
          color: #7c6e89;
          font-size: 9px;
        }

        .authMenu > a,
        .authMenu > button {
          width: 100%;
          min-height: 41px;
          padding: 0 10px;
          border: 0;
          border-radius: 11px;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #493a55;
          background: transparent;
          font-family: inherit;
          font-size: 10px;
          font-weight: 800;
          text-align: right;
          text-decoration: none;
          cursor: pointer;
        }

        .authMenu > a:hover,
        .authMenu > button:hover,
        .authMenu > a:focus-visible,
        .authMenu > button:focus-visible {
          color: #5b21b6;
          background: #f5f0ff;
          outline: 0;
        }

        .authMenu > a > span,
        .authMenu > button > span {
          width: 27px;
          height: 27px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          color: #6d28d9;
          background: #f2ebff;
          font-size: 13px;
        }

        .authMenu > button:last-child {
          margin-top: 5px;
          color: #b42318;
          border-top: 1px solid #f1e9f7;
          border-radius: 0 0 11px 11px;
        }

        .authMenu > button:last-child > span {
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
