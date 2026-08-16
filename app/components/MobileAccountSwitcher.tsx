"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { clearActiveAccount, saveActiveAccount } from "../lib/active-account";

type SavedUser = { display_name?: string; full_name?: string | null; business_name?: string | null };
type Activity = { id: number; type: string; name: string; external_dealer_id?: number | null; logo_url?: string | null };
type Membership = { type: string; name: string; external_dealer_id?: number | null; role?: string; logo_url?: string | null };
type ActivitiesResponse = { success?: boolean; activities?: Activity[]; memberships?: Membership[] };

function tokenHeaders(): Record<string, string> {
  const token = typeof window === "undefined" ? "" : localStorage.getItem("chakod_session_token") || "";
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}
function readUser(): SavedUser | null {
  try {
    const raw = localStorage.getItem("chakod_user");
    return raw ? JSON.parse(raw) as SavedUser : null;
  } catch { return null; }
}
function accountLabel(type: string) {
  if (type === "dealer") return "نمایشگاه خودرو";
  if (type === "parts_store") return "فروشگاه قطعات";
  if (type === "repair_shop") return "تعمیرگاه خودرو";
  if (type === "car_service") return "مرکز خدمات خودرو";
  return "کسب‌وکار";
}
function roleLabel(role?: string) {
  if (role === "owner") return "مالک";
  if (role === "manager") return "مدیر";
  if (role === "sales") return "فروش";
  if (role === "content") return "محتوا";
  if (role === "finance") return "مالی";
  return "عضو مجموعه";
}
function manageHref(item: { type: string; id?: number; external_dealer_id?: number | null }) {
  if (item.type === "dealer" && item.external_dealer_id) return `/account/business?dealer_id=${item.external_dealer_id}`;
  return item.id ? `/account-v2/businesses/${item.id}` : "/account-v2/profile";
}
function PersonIcon() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8"/><path d="M5 20c.6-4 3.1-6 7-6s6.4 2 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}

export default function MobileAccountSwitcher() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const user = typeof window === "undefined" ? null : readUser();
  const displayName = user?.display_name?.trim() || user?.business_name?.trim() || user?.full_name?.trim() || "حساب شخصی";

  useEffect(() => {
    if (!open || loaded) return;
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      try {
        // Import an explicitly typed legacy professional business before reading the switcher list.
        // The server accepts only authenticated non-dealer profile types, so no business is inferred by name.
        await fetch("/api/auth/sync-legacy-professional-activity", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json", "Content-Type": "application/json", ...tokenHeaders() },
          body: JSON.stringify({}),
        }).catch(() => undefined);

        const response = await fetch("/api/auth/account-activities", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json", ...tokenHeaders() },
        });
        const json = await response.json() as ActivitiesResponse;
        if (response.ok && json.success) {
          setActivities(Array.isArray(json.activities) ? json.activities : []);
          setMemberships(Array.isArray(json.memberships) ? json.memberships : []);
        }
      } catch {
        // Keep the personal account and fixed actions available even if the list cannot load.
      } finally {
        setLoaded(true);
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [open, loaded]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("chakod:auth-changed", close);
    return () => window.removeEventListener("chakod:auth-changed", close);
  }, []);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...tokenHeaders() },
        body: JSON.stringify({}),
      });
    } catch {}
    localStorage.removeItem("chakod_session_token");
    localStorage.removeItem("chakod_user");
    localStorage.removeItem("chakod_identity");
    clearActiveAccount();
    window.dispatchEvent(new Event("chakod:auth-changed"));
    window.location.assign("/");
  }

  return <div className="mobileAccountSwitcher" ref={shellRef}>
    <button type="button" className="mobileAccountTrigger" onClick={() => setOpen(value => !value)} aria-label="انتخاب حساب" aria-haspopup="menu" aria-expanded={open}>
      <PersonIcon />
      <span>حساب</span>
    </button>

    {open ? <>
      <button type="button" className="mobileAccountBackdrop" aria-label="بستن منوی حساب" onClick={() => setOpen(false)} />
      <div className="mobileAccountSheet" role="menu" dir="rtl">
        <div className="mobileAccountHandle" aria-hidden="true" />
        <div className="mobileAccountTitle">انتخاب حساب</div>
        <Link href="/account" className="mobileAccountRow" role="menuitem" onClick={() => { saveActiveAccount({ kind: "personal" }); setOpen(false); }}>
          <span className="mobileAccountRowIcon"><PersonIcon /></span>
          <span><strong>حساب شخصی</strong><small>{displayName}</small></span>
        </Link>
        {loading && activities.length === 0 && memberships.length === 0 ? <div className="mobileAccountLoading">در حال دریافت کسب‌وکارها…</div> : null}
        {activities.map(activity => <Link key={`activity-${activity.id}`} href={manageHref(activity)} className="mobileAccountRow" role="menuitem" onClick={() => { saveActiveAccount({ kind: "activity", id: activity.id, type: activity.type, name: activity.name, external_dealer_id: activity.external_dealer_id, logo_url: activity.logo_url }); setOpen(false); }}>
          <span className="mobileAccountRowIcon">▣</span>
          <span><strong>{activity.name}</strong><small>{accountLabel(activity.type)}</small></span>
        </Link>)}
        {memberships.map((membership, index) => <Link key={`membership-${membership.external_dealer_id || index}`} href={manageHref(membership)} className="mobileAccountRow" role="menuitem" onClick={() => { if (membership.external_dealer_id) saveActiveAccount({ kind: "membership", type: membership.type, name: membership.name, external_dealer_id: membership.external_dealer_id, role: membership.role, logo_url: membership.logo_url }); setOpen(false); }}>
          <span className="mobileAccountRowIcon">▣</span>
          <span><strong>{membership.name}</strong><small>{accountLabel(membership.type)} · {roleLabel(membership.role)}</small></span>
        </Link>)}
        <Link href="/account-v2/businesses/new" className="mobileAccountRow mobileAccountAdd" role="menuitem" onClick={() => setOpen(false)}>
          <span className="mobileAccountRowIcon">＋</span><span><strong>افزودن کسب‌وکار</strong></span>
        </Link>
        <button type="button" className="mobileAccountRow mobileAccountLogout" role="menuitem" onClick={() => void logout()} disabled={loggingOut}>
          <span className="mobileAccountRowIcon">↪</span><span><strong>{loggingOut ? "در حال خروج..." : "خروج از حساب"}</strong></span>
        </button>
      </div>
    </> : null}

    <style>{`.mobileAccountSwitcher{position:static;width:100%;height:100%}.mobileAccountTrigger{width:100%;height:56px;min-width:0;padding:4px 2px;border:0;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:inherit;background:transparent;font-family:inherit;cursor:pointer}.mobileAccountTrigger svg{width:24px;height:24px}.mobileAccountTrigger span{font-size:10px;font-weight:900;line-height:1.3}.mobileAccountBackdrop{position:fixed;inset:0;z-index:2147483645;border:0;background:rgba(29,16,43,.18);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}.mobileAccountSheet{position:fixed;right:10px;bottom:calc(96px + env(safe-area-inset-bottom,0px));left:10px;z-index:2147483646;width:auto;max-width:520px;max-height:min(64vh,560px);margin-inline:auto;overflow-y:auto;padding:10px;border:1px solid #e8def5;border-radius:22px;color:#211633;background:rgba(255,255,255,.985);box-shadow:0 24px 70px rgba(38,20,58,.28);animation:mobileAccountSheetIn 180ms ease-out both}.mobileAccountHandle{width:42px;height:4px;margin:1px auto 8px;border-radius:999px;background:#ddd2e8}.mobileAccountTitle{padding:2px 8px 8px;font-size:12px;font-weight:950;color:#2f1c42}.mobileAccountRow{width:100%;min-height:52px;padding:7px 9px;border:0;border-radius:13px;display:flex;align-items:center;gap:10px;color:#493a55;background:transparent;font-family:inherit;text-align:right;text-decoration:none;cursor:pointer}.mobileAccountRow:active{background:#f7f2fd}.mobileAccountRowIcon{flex:0 0 34px;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:#6d28d9;background:#f2ebff;font-size:15px}.mobileAccountRowIcon svg{width:20px;height:20px}.mobileAccountRow>span:last-child{min-width:0;display:block;flex:1}.mobileAccountRow strong,.mobileAccountRow small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mobileAccountRow strong{font-size:12px;font-weight:900}.mobileAccountRow small{margin-top:2px;color:#8b7d95;font-size:9.5px}.mobileAccountLoading{padding:9px 12px;color:#8b7d95;font-size:10px}.mobileAccountAdd{margin-top:5px;border-top:1px solid #eee7f6;border-radius:0;color:#6422b8}.mobileAccountLogout{margin-top:2px;border-top:1px solid #f1e9f7;border-radius:0 0 13px 13px;color:#b42318}.mobileAccountLogout:disabled{opacity:.6}@keyframes mobileAccountSheetIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`}</style>
  </div>;
}
