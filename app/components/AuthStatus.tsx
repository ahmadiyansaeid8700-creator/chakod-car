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
  status?: string;
  verification_status?: string;
};

type AccountMembership = {
  type: string;
  external_dealer_id?: number;
  name: string;
  role?: string;
};

type ActivitiesResponse = {
  success?: boolean;
  activities?: AccountActivity[];
  memberships?: AccountMembership[];
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
      <circle
        cx="16"
        cy={crowned ? "16" : "12.8"}
        r="4.2"
        stroke="currentColor"
        strokeWidth="2"
      />
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

function BusinessIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 10h16l-1.5-5h-13L4 10Z" />
      <path d="M5.5 10v9h13v-9M9 19v-5h6v5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m14.5 6.5-5.5 5.5 5.5 5.5" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
    </svg>
  );
}

function activityLabel(type: string) {
  if (type === "dealer") return "نمایشگاه خودرو";
  if (type === "parts_store") return "فروشگاه قطعات";
  if (type === "repair_shop") return "تعمیرگاه خودرو";
  if (type === "car_service") return "مرکز خدمات خودرو";
  return "کسب‌وکار";
}

function membershipRole(role?: string) {
  if (role === "owner") return "مالک";
  if (role === "manager") return "مدیر";
  if (role === "sales") return "فروش";
  if (role === "content") return "محتوا";
  if (role === "finance") return "مالی";
  return "عضو مجموعه";
}

function activityManageHref(activity: AccountActivity) {
  if (activity.type === "dealer" && activity.external_dealer_id) {
    return `/account/business?dealer_id=${activity.external_dealer_id}`;
  }
  return `/account-v2/businesses/${activity.id}`;
}

function membershipManageHref(membership: AccountMembership) {
  if (membership.type === "dealer" && membership.external_dealer_id) {
    return `/account/business?dealer_id=${membership.external_dealer_id}`;
  }
  return "/account";
}

function maskMobile(value?: string) {
  const mobile = String(value || "").trim();
  if (!mobile) return "حساب شخصی";
  if (mobile.length < 8) return mobile;
  return `${mobile.slice(0, 4)}••••${mobile.slice(-3)}`;
}

export default function AuthStatus() {
  const [user, setUser] = useState<ChakodUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activities, setActivities] = useState<AccountActivity[]>([]);
  const [memberships, setMemberships] = useState<AccountMembership[]>([]);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const loadActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const response = await fetch("/api/auth/account-activities", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...authHeaders(),
        },
      });
      const payload = (await response.json().catch(() => null)) as ActivitiesResponse | null;
      if (response.ok && payload?.success) {
        setActivities(Array.isArray(payload.activities) ? payload.activities : []);
        setMemberships(Array.isArray(payload.memberships) ? payload.memberships : []);
      } else {
        setActivities([]);
        setMemberships([]);
      }
    } catch {
      setActivities([]);
      setMemberships([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  const loadUser = useCallback(async () => {
    const cachedUser = readSavedUser();
    const cachedIdentity = readSavedIdentity();

    if (cachedUser) setUser(cachedUser);

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
        localStorage.setItem("chakod_user", JSON.stringify(json.user));
        localStorage.setItem("chakod_identity", JSON.stringify(nextIdentity));
        void loadActivities();
        return;
      }

      if (json.success && json.logged_in === false) {
        clearLocalAuth();
        setUser(null);
        setActivities([]);
        setMemberships([]);
      } else if (cachedUser) {
        localStorage.setItem("chakod_identity", JSON.stringify(cachedIdentity));
        void loadActivities();
      }
    } catch {
      if (cachedUser) void loadActivities();
    } finally {
      setLoading(false);
    }
  }, [loadActivities]);

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
    void loadActivities();

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
  }, [loadActivities, menuOpen]);

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
      // پاک‌سازی محلی حتی در قطع موقت سرویس انجام می‌شود.
    } finally {
      clearLocalAuth();
      setUser(null);
      setActivities([]);
      setMemberships([]);
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

  const displayName = user.display_name?.trim() || user.full_name?.trim() || "حساب من";
  const hasBusinesses = activities.length > 0 || memberships.length > 0;

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
          <span>حساب من</span>
        </div>
        <span className="authMenuChevron" aria-hidden="true">⌄</span>
      </button>

      {menuOpen ? (
        <div className="authMenu" role="menu" dir="rtl">
          <div className="authMenuLabel">حساب‌ها و کسب‌وکارها</div>

          <Link className="accountSwitchRow personalRow" role="menuitem" href="/account" onClick={() => setMenuOpen(false)}>
            <span className="switchIcon personalIcon"><UserAvatarIcon /></span>
            <span className="switchCopy">
              <strong>حساب شخصی</strong>
              <small>{displayName} · {maskMobile(user.mobile)}</small>
            </span>
            <span className="switchChevron"><ChevronIcon /></span>
          </Link>

          <div className="businessDivider" />

          {activitiesLoading && !hasBusinesses ? (
            <div className="businessLoading">در حال دریافت کسب‌وکارها…</div>
          ) : null}

          {activities.map((activity) => (
            <Link
              key={`activity-${activity.id}`}
              className="accountSwitchRow businessRow"
              role="menuitem"
              href={activityManageHref(activity)}
              onClick={() => setMenuOpen(false)}
            >
              <span className="switchIcon businessIcon"><BusinessIcon /></span>
              <span className="switchCopy">
                <strong>{activity.name}</strong>
                <small>{activityLabel(activity.type)}</small>
              </span>
              <span className="switchChevron"><ChevronIcon /></span>
            </Link>
          ))}

          {memberships.map((membership, index) => (
            <Link
              key={`membership-${membership.external_dealer_id || index}`}
              className="accountSwitchRow businessRow"
              role="menuitem"
              href={membershipManageHref(membership)}
              onClick={() => setMenuOpen(false)}
            >
              <span className="switchIcon businessIcon"><BusinessIcon /></span>
              <span className="switchCopy">
                <strong>{membership.name}</strong>
                <small>{activityLabel(membership.type)} · {membershipRole(membership.role)}</small>
              </span>
              <span className="switchChevron"><ChevronIcon /></span>
            </Link>
          ))}

          {!activitiesLoading && !hasBusinesses ? (
            <div className="emptyBusinesses">هنوز کسب‌وکاری به این حساب اضافه نشده.</div>
          ) : null}

          <div className="businessDivider" />

          <Link className="accountSwitchRow addBusinessRow" role="menuitem" href="/account-v2/businesses/new" onClick={() => setMenuOpen(false)}>
            <span className="switchIcon addIcon"><PlusIcon /></span>
            <span className="switchCopy">
              <strong>افزودن کسب‌وکار</strong>
              <small>ثبت یک فعالیت جدید در چاکود</small>
            </span>
            <span className="switchChevron"><ChevronIcon /></span>
          </Link>

          <button className="logoutRow" type="button" role="menuitem" onClick={() => void logout()} disabled={loggingOut}>
            <span className="switchIcon logoutIcon"><LogoutIcon /></span>
            <span className="switchCopy">
              <strong>{loggingOut ? "در حال خروج…" : "خروج از حساب"}</strong>
              <small>پایان نشست فعلی</small>
            </span>
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
          width: min(330px, calc(100vw - 24px));
          max-height: min(610px, calc(100vh - 110px));
          overflow-y: auto;
          padding: 10px;
          border: 1px solid rgba(111, 40, 217, 0.14);
          border-radius: 22px;
          color: #251531;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 26px 70px rgba(53, 24, 84, 0.18);
          backdrop-filter: blur(20px);
          scrollbar-width: thin;
          scrollbar-color: #d8c4f8 transparent;
        }

        .authMenuLabel {
          padding: 5px 8px 10px;
          color: #8b7a99;
          font-size: 10px;
          font-weight: 800;
        }

        .accountSwitchRow,
        .logoutRow {
          width: 100%;
          min-height: 58px;
          padding: 7px 8px;
          border: 0;
          border-radius: 15px;
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr) 22px;
          align-items: center;
          gap: 10px;
          color: #34243f;
          background: transparent;
          font-family: inherit;
          text-align: right;
          text-decoration: none;
          cursor: pointer;
          transition: background 160ms ease, transform 160ms ease, color 160ms ease;
        }

        .accountSwitchRow:hover,
        .accountSwitchRow:focus-visible,
        .logoutRow:hover,
        .logoutRow:focus-visible {
          background: #f7f2ff;
          outline: 0;
          transform: translateY(-1px);
        }

        .switchIcon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: #6f28d9;
          background: linear-gradient(145deg, #f3eaff, #faf7ff);
          border: 1px solid #eadcff;
        }

        .switchIcon svg {
          width: 20px;
          height: 20px;
        }

        .personalIcon {
          color: #fff;
          background: linear-gradient(145deg, #6f28d9, #8a36ed);
          border-color: transparent;
          box-shadow: 0 8px 18px rgba(111, 40, 217, 0.22);
        }

        .personalIcon svg {
          width: 22px;
          height: 22px;
        }

        .switchCopy {
          min-width: 0;
          display: block;
        }

        .switchCopy strong,
        .switchCopy small {
          display: block;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .switchCopy strong {
          color: #2d1938;
          font-size: 12px;
          font-weight: 900;
        }

        .switchCopy small {
          margin-top: 4px;
          color: #8b7d94;
          font-size: 9px;
          font-weight: 650;
        }

        .switchChevron {
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          color: #a68fb9;
        }

        .switchChevron svg {
          width: 17px;
          height: 17px;
        }

        .businessDivider {
          height: 1px;
          margin: 7px 8px;
          background: #eee6f7;
        }

        .businessLoading,
        .emptyBusinesses {
          margin: 4px 6px;
          padding: 12px 10px;
          border-radius: 12px;
          color: #8a7c93;
          background: #faf8fc;
          font-size: 9px;
          font-weight: 700;
          text-align: center;
        }

        .addBusinessRow {
          color: #5b21b6;
        }

        .addIcon {
          color: #fff;
          background: linear-gradient(145deg, #6f28d9, #8a36ed);
          border-color: transparent;
        }

        .logoutRow {
          grid-template-columns: 38px minmax(0, 1fr);
          margin-top: 3px;
          color: #b42318;
        }

        .logoutRow .switchCopy strong {
          color: #b42318;
        }

        .logoutIcon {
          color: #b42318;
          background: #fff2f1;
          border-color: #ffd8d4;
        }

        .logoutRow:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        @media (max-width: 640px) {
          .authMenu {
            position: fixed;
            top: 68px;
            right: 10px;
            left: 10px;
            width: auto;
            max-height: calc(100vh - 88px);
            border-radius: 20px;
          }

          .authMenuChevron,
          .authStatusText {
            display: none !important;
          }

          .accountSwitchRow,
          .logoutRow {
            min-height: 62px;
          }

          .switchCopy strong {
            font-size: 13px;
          }

          .switchCopy small {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}
