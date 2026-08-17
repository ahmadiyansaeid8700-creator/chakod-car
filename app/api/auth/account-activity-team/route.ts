import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { accountActivities } from "../../../../db/schema";
import {
  ensureAccountActivityTeamSchema,
  getAccountActivityMembership,
  listActivityTeam,
  normalizeTeamMobile,
  normalizeTeamRole,
  readAccountActivityTeamIdentity,
  teamRoleLabel,
  type AccountActivityMembership,
  type AccountActivityTeamIdentity,
} from "../../../../lib/account-activity-team";
import { jsonResponse, rejectCrossSiteMutation } from "../../../../lib/chakod-auth-proxy";
import { getRuntimeEnv } from "../../../../lib/runtime-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Access = {
  activity: typeof accountActivities.$inferSelect;
  role: "owner" | "manager" | "sales" | "content" | "finance" | "viewer";
  membership: AccountActivityMembership | null;
  active: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function positiveId(value: unknown) {
  const id = Math.round(Number(value || 0));
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function readInput(request: NextRequest) {
  try {
    const value: unknown = await request.json();
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

async function resolveAccess(
  activityId: number,
  identity: AccountActivityTeamIdentity,
): Promise<Access | null> {
  const [activity] = await getDb()
    .select()
    .from(accountActivities)
    .where(eq(accountActivities.id, activityId))
    .limit(1);
  if (!activity || activity.activityType === "dealer") return null;

  if (activity.ownerUserId === identity.id) {
    return { activity, role: "owner", membership: null, active: true };
  }

  const membership = await getAccountActivityMembership(activityId, identity);
  if (!membership) return null;
  return {
    activity,
    role: membership.role,
    membership,
    active: membership.status === "active",
  };
}

function canManage(access: Access) {
  return access.active && (access.role === "owner" || access.role === "manager");
}

function publicMember(member: AccountActivityMembership) {
  return {
    id: member.id,
    user_id: member.member_user_id,
    mobile: member.member_mobile,
    display_name: member.display_name || "عضو تیم",
    role: member.role,
    role_label: teamRoleLabel(member.role),
    status: member.status,
    created_at: member.created_at,
    updated_at: member.updated_at,
  };
}

export async function GET(request: NextRequest) {
  const identity = await readAccountActivityTeamIdentity();
  if (!identity) return jsonResponse({ success: false, message: "برای مشاهده تیم وارد حساب شوید." }, 401);

  const activityId = positiveId(request.nextUrl.searchParams.get("activity_id"));
  if (!activityId) return jsonResponse({ success: false, message: "شناسه کسب‌وکار معتبر نیست." }, 400);

  try {
    await ensureAccountActivityTeamSchema();
    const access = await resolveAccess(activityId, identity);
    if (!access) return jsonResponse({ success: false, message: "به تیم این کسب‌وکار دسترسی ندارید." }, 403);

    if (!access.active) {
      return jsonResponse({
        success: true,
        activity: { id: access.activity.id, name: access.activity.name, type: access.activity.activityType },
        access: { role: access.role, status: access.membership?.status || "invited", can_manage: false },
        members: access.membership ? [publicMember(access.membership)] : [],
      });
    }

    const members = canManage(access)
      ? await listActivityTeam(activityId)
      : access.membership
        ? [access.membership]
        : [];

    return jsonResponse({
      success: true,
      activity: { id: access.activity.id, name: access.activity.name, type: access.activity.activityType },
      access: { role: access.role, status: "active", can_manage: canManage(access) },
      members: members.map(publicMember),
    });
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات تیم فعلاً در دسترس نیست." }, 503);
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const identity = await readAccountActivityTeamIdentity();
  if (!identity) return jsonResponse({ success: false, message: "برای مدیریت تیم وارد حساب شوید." }, 401);
  const input = await readInput(request);
  if (!input) return jsonResponse({ success: false, message: "اطلاعات ارسالی معتبر نیست." }, 400);

  const action = clean(input.action, 30);
  const activityId = positiveId(input.activity_id);
  if (!activityId) return jsonResponse({ success: false, message: "شناسه کسب‌وکار معتبر نیست." }, 400);

  try {
    await ensureAccountActivityTeamSchema();
    const access = await resolveAccess(activityId, identity);
    if (!access) return jsonResponse({ success: false, message: "به این کسب‌وکار دسترسی ندارید." }, 403);

    if (action === "accept_invite") {
      if (!access.membership || access.membership.status !== "invited") {
        return jsonResponse({ success: false, message: "دعوت فعالی برای پذیرش پیدا نشد." }, 409);
      }
      await getRuntimeEnv().DB
        .prepare(`UPDATE account_activity_members
          SET status = 'active', member_user_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND activity_id = ? AND member_mobile = ? AND status = 'invited'`)
        .bind(identity.id, access.membership.id, activityId, identity.mobile)
        .run();
      return jsonResponse({ success: true, message: `عضویت شما در «${access.activity.name}» فعال شد.` });
    }

    if (action !== "invite") {
      return jsonResponse({ success: false, message: "عملیات تیم شناخته نشد." }, 400);
    }
    if (!canManage(access)) {
      return jsonResponse({ success: false, message: "اجازه افزودن عضو به این تیم را ندارید." }, 403);
    }

    const mobile = normalizeTeamMobile(input.mobile);
    const displayName = clean(input.display_name, 120);
    const role = normalizeTeamRole(input.role);
    if (!mobile) return jsonResponse({ success: false, message: "شماره موبایل عضو معتبر نیست." }, 422);
    if (mobile === identity.mobile) return jsonResponse({ success: false, message: "حساب خودتان از قبل به این مجموعه دسترسی دارد." }, 409);
    if (access.role === "manager" && role === "manager") {
      return jsonResponse({ success: false, message: "فقط مالک مجموعه می‌تواند مدیر جدید تعیین کند." }, 403);
    }

    const existing = await getRuntimeEnv().DB
      .prepare(`SELECT id, status FROM account_activity_members WHERE activity_id = ? AND member_mobile = ? LIMIT 1`)
      .bind(activityId, mobile)
      .first<{ id: number; status: string }>();
    if (existing?.status === "active") {
      return jsonResponse({ success: false, message: "این شخص هم‌اکنون عضو فعال تیم است." }, 409);
    }

    if (existing?.id) {
      await getRuntimeEnv().DB
        .prepare(`UPDATE account_activity_members
          SET display_name = ?, role = ?, status = 'invited', created_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND activity_id = ?`)
        .bind(displayName, role, identity.id, existing.id, activityId)
        .run();
    } else {
      await getRuntimeEnv().DB
        .prepare(`INSERT INTO account_activity_members
          (activity_id, member_user_id, member_mobile, display_name, role, status, created_by_user_id)
          VALUES (?, NULL, ?, ?, ?, 'invited', ?)`)
        .bind(activityId, mobile, displayName, role, identity.id)
        .run();
    }

    return jsonResponse({ success: true, message: "دعوت عضو تیم ثبت شد." });
  } catch {
    return jsonResponse({ success: false, message: "ثبت تغییرات تیم انجام نشد." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const identity = await readAccountActivityTeamIdentity();
  if (!identity) return jsonResponse({ success: false, message: "برای مدیریت تیم وارد حساب شوید." }, 401);
  const input = await readInput(request);
  if (!input) return jsonResponse({ success: false, message: "اطلاعات ارسالی معتبر نیست." }, 400);

  const activityId = positiveId(input.activity_id);
  const memberId = positiveId(input.member_id);
  if (!activityId || !memberId) return jsonResponse({ success: false, message: "شناسه عضو یا کسب‌وکار معتبر نیست." }, 400);

  try {
    const access = await resolveAccess(activityId, identity);
    if (!access || !canManage(access)) {
      return jsonResponse({ success: false, message: "اجازه مدیریت اعضای این تیم را ندارید." }, 403);
    }

    const target = await getRuntimeEnv().DB
      .prepare(`SELECT id, member_user_id, role, status FROM account_activity_members WHERE id = ? AND activity_id = ? LIMIT 1`)
      .bind(memberId, activityId)
      .first<{ id: number; member_user_id: number | null; role: string; status: string }>();
    if (!target) return jsonResponse({ success: false, message: "عضو تیم پیدا نشد." }, 404);
    if (access.membership?.id === memberId) {
      return jsonResponse({ success: false, message: "مدیر نمی‌تواند دسترسی خودش را از این بخش تغییر دهد." }, 409);
    }
    if (access.role === "manager" && target.role === "manager") {
      return jsonResponse({ success: false, message: "تغییر دسترسی مدیر دیگر فقط توسط مالک ممکن است." }, 403);
    }

    const status = clean(input.status, 20);
    const role = normalizeTeamRole(input.role || target.role);
    if (access.role === "manager" && role === "manager") {
      return jsonResponse({ success: false, message: "فقط مالک مجموعه می‌تواند نقش مدیر بدهد." }, 403);
    }
    const allowedStatus = new Set(["active", "disabled", "removed"]);
    if (!allowedStatus.has(status)) return jsonResponse({ success: false, message: "وضعیت عضو معتبر نیست." }, 422);

    await getRuntimeEnv().DB
      .prepare(`UPDATE account_activity_members SET role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND activity_id = ?`)
      .bind(role, status, memberId, activityId)
      .run();

    return jsonResponse({
      success: true,
      message: status === "removed" ? "عضو از تیم حذف شد و دسترسی او قطع شد." : "دسترسی عضو به‌روزرسانی شد.",
    });
  } catch {
    return jsonResponse({ success: false, message: "تغییر دسترسی عضو انجام نشد." }, 503);
  }
}
