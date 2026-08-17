"use client";

import { useEffect, useState } from "react";

import { formatDualDate } from "../../../../lib/date-display";
import styles from "./BusinessTeamPanel.module.css";

type Member = {
  id: number;
  user_id?: number | null;
  mobile: string;
  display_name: string;
  role: string;
  role_label: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type TeamResponse = {
  success?: boolean;
  message?: string;
  access?: { role?: string; status?: string; can_manage?: boolean };
  members?: Member[];
};

type Props = {
  activityId: number;
};

const roleOptions = [
  ["manager", "مدیر"],
  ["sales", "فروش"],
  ["content", "محتوا"],
  ["finance", "مالی"],
  ["viewer", "ناظر"],
] as const;

function authHeaders(): Record<string, string> {
  const token = typeof window === "undefined" ? "" : localStorage.getItem("chakod_session_token") || "";
  return token ? { Authorization: `Bearer ${token}`, "X-Session-Token": token } : {};
}

function statusLabel(status: string) {
  if (status === "active") return "فعال";
  if (status === "invited") return "در انتظار پذیرش";
  if (status === "disabled") return "غیرفعال";
  return "حذف‌شده";
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try { return JSON.parse(text) as T; } catch { throw new Error("پاسخ سرور معتبر نیست."); }
}

export default function BusinessTeamPanel({ activityId }: Props) {
  const [data, setData] = useState<TeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [invite, setInvite] = useState({ display_name: "", mobile: "", role: "sales" });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/account-activity-team?activity_id=${activityId}`, {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const payload = await readJson<TeamResponse>(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "اطلاعات تیم دریافت نشد.");
      setData(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "اطلاعات تیم دریافت نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [activityId]);

  async function inviteMember() {
    if (inviting) return;
    setInviting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/account-activity-team", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "invite", activity_id: activityId, ...invite }),
      });
      const payload = await readJson<TeamResponse>(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "دعوت عضو انجام نشد.");
      setNotice(payload.message || "دعوت عضو ثبت شد.");
      setInvite({ display_name: "", mobile: "", role: "sales" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "دعوت عضو انجام نشد.");
    } finally {
      setInviting(false);
    }
  }

  async function updateMember(member: Member, values: { role?: string; status?: string }) {
    if (workingId) return;
    if (values.status === "removed") {
      const confirmed = window.confirm(`«${member.display_name}» از تیم حذف شود؟ دسترسی این شخص به مجموعه قطع خواهد شد.`);
      if (!confirmed) return;
    }
    setWorkingId(member.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/account-activity-team", {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          activity_id: activityId,
          member_id: member.id,
          role: values.role || member.role,
          status: values.status || member.status,
        }),
      });
      const payload = await readJson<TeamResponse>(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "تغییر عضو انجام نشد.");
      setNotice(payload.message || "دسترسی عضو به‌روزرسانی شد.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تغییر عضو انجام نشد.");
    } finally {
      setWorkingId(null);
    }
  }

  const canManage = Boolean(data?.access?.can_manage);
  const actorRole = data?.access?.role || "viewer";
  const members = data?.members || [];

  return (
    <section className={styles.panel} id="business-team" dir="rtl">
      <div className={styles.heading}>
        <div>
          <span>تیم مجموعه</span>
          <h2>پرسنل و دسترسی‌ها</h2>
          <p>هر عضو با حساب خودش وارد می‌شود و کیف پول شخصی خودش را دارد؛ موجودی اعضا با حساب مجموعه ادغام نمی‌شود.</p>
        </div>
        <strong>{loading ? "…" : `${members.length.toLocaleString("fa-IR")} عضو`}</strong>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {notice ? <div className={styles.notice}>{notice}</div> : null}

      {canManage ? (
        <div className={styles.inviteBox}>
          <div className={styles.inviteTitle}>
            <strong>افزودن عضو تیم</strong>
            <small>دعوت به شماره موبایل حساب چاکود ارسال می‌شود.</small>
          </div>
          <div className={styles.inviteGrid}>
            <label>
              <span>نام عضو</span>
              <input value={invite.display_name} onChange={(event) => setInvite((current) => ({ ...current, display_name: event.target.value }))} placeholder="مثلاً علی رضایی" />
            </label>
            <label>
              <span>شماره موبایل</span>
              <input value={invite.mobile} onChange={(event) => setInvite((current) => ({ ...current, mobile: event.target.value }))} inputMode="tel" placeholder="09xxxxxxxxx" />
            </label>
            <label>
              <span>نقش</span>
              <select value={invite.role} onChange={(event) => setInvite((current) => ({ ...current, role: event.target.value }))}>
                {roleOptions.filter(([value]) => actorRole === "owner" || value !== "manager").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <button type="button" disabled={inviting || invite.mobile.trim().length < 11} onClick={() => void inviteMember()}>
              {inviting ? "در حال ثبت دعوت…" : "دعوت به تیم"}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.memberAccess}>سطح دسترسی شما: <strong>{roleOptions.find(([value]) => value === actorRole)?.[1] || actorRole}</strong></div>
      )}

      <div className={styles.members}>
        {!loading && !members.length ? <div className={styles.empty}>هنوز عضوی برای این مجموعه ثبت نشده است.</div> : null}
        {members.map((member) => (
          <article className={styles.memberCard} key={member.id}>
            <div className={styles.memberTop}>
              <span className={styles.avatar}>{(member.display_name || "ع").slice(0, 1)}</span>
              <span className={styles.memberCopy}>
                <strong>{member.display_name || "عضو تیم"}</strong>
                <small>{member.mobile}</small>
              </span>
              <span className={`${styles.status} ${styles[`status_${member.status}`] || ""}`}>{statusLabel(member.status)}</span>
            </div>

            <div className={styles.memberMeta}>
              <span><small>نقش</small><strong>{member.role_label}</strong></span>
              <span><small>ثبت عضویت</small><strong>{formatDualDate(member.created_at)}</strong></span>
            </div>

            {canManage ? (
              <div className={styles.memberActions}>
                <select
                  aria-label={`نقش ${member.display_name}`}
                  value={member.role}
                  disabled={workingId === member.id}
                  onChange={(event) => void updateMember(member, { role: event.target.value })}
                >
                  {roleOptions.filter(([value]) => actorRole === "owner" || value !== "manager").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {member.status === "active" ? <button type="button" className={styles.secondary} disabled={workingId === member.id} onClick={() => void updateMember(member, { status: "disabled" })}>غیرفعال کردن</button> : null}
                {member.status === "disabled" ? <button type="button" className={styles.secondary} disabled={workingId === member.id} onClick={() => void updateMember(member, { status: "active" })}>فعال کردن</button> : null}
                <button type="button" className={styles.remove} disabled={workingId === member.id} onClick={() => void updateMember(member, { status: "removed" })}>
                  {workingId === member.id ? "در حال اعمال…" : member.status === "invited" ? "لغو دعوت" : "حذف از تیم"}
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
