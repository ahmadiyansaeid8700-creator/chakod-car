"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE = "https://chakod.com";

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

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chakod_session_token") || "";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "X-Session-Token": token }
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

export default function AuthStatus() {
  const [user, setUser] = useState<ChakodUser | null>(null);
  const [identity, setIdentity] = useState<IdentityCache>({});
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadUser = useCallback(async () => {
    const cachedUser = readSavedUser();
    const cachedIdentity = readSavedIdentity();

    if (cachedUser) setUser(cachedUser);
    setIdentity(cachedIdentity);

    try {
      const res = await fetch(`${API_BASE}/api/me.php`, {
        method: "GET",
        headers: { Accept: "application/json", ...authHeaders() },
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
      // حافظه محلی فقط هنگام قطع موقت API نگه داشته می‌شود.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();

    const handleAuthChange = () => {
      setLoading(true);
      void loadUser();
    };

    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("chakod:auth-changed", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("chakod:auth-changed", handleAuthChange);
    };
  }, [loadUser]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch(`${API_BASE}/api/logout.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...authHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ all_devices: false }),
      });
    } finally {
      clearLocalAuth();
      setUser(null);
      setIdentity({});
      setLoggingOut(false);
      window.dispatchEvent(new CustomEvent("chakod:auth-changed"));
      window.location.href = "/login";
    }
  }

  if (loading && !user) {
    return (
      <div className="authStatus authStatusLoading">
        <div className="authAvatar">چ</div>
        <div>
          <strong>در حال بررسی...</strong>
          <span>وضعیت ورود</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <a className="authStatus authStatusGuest" href="/login">
        <div className="authAvatar">♕</div>
        <div>
          <strong>ورود / ثبت‌نام</strong>
          <span>فعال‌سازی تاج چاکود</span>
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
    identity.redirect_to &&
    identity.redirect_to.startsWith("/") &&
    !identity.redirect_to.startsWith("//")
      ? identity.redirect_to
      : "/account";

  return (
    <div className="chakodAuthStatusWrap">
      <a className="authStatus authStatusUser" href={accountHref}>
        <div className="authAvatar">👑</div>
        <div>
          <strong>سلام، {displayName}</strong>
          <span>
            {identity.role_title ||
              user.mobile_masked ||
              user.mobile ||
              "حساب تأییدشده"}
          </span>
        </div>
      </a>

      <button
        type="button"
        className="chakodLogoutButton"
        onClick={() => void logout()}
        disabled={loggingOut}
        title="خروج از حساب"
      >
        {loggingOut ? "..." : "خروج"}
      </button>

      <style>{`
        .chakodAuthStatusWrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .chakodLogoutButton {
          border: 1px solid #eadcff;
          background: #fff;
          color: #6d28d9;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .chakodLogoutButton:disabled {
          opacity: 0.55;
          cursor: wait;
        }
        @media (max-width: 640px) {
          .chakodLogoutButton {
            padding: 8px 10px;
          }
        }
      `}</style>
    </div>
  );
}