import { getRuntimeEnv } from "./runtime-env";
import { readServerIdentity } from "./server-route-access";

export type AccountActivityTeamRole = "manager" | "sales" | "content" | "finance" | "viewer";
export type AccountActivityTeamStatus = "invited" | "active" | "disabled" | "removed";

export type AccountActivityTeamIdentity = {
  id: number;
  mobile: string;
  displayName: string;
};

export type AccountActivityMembership = {
  id: number;
  activity_id: number;
  member_user_id: number | null;
  member_mobile: string;
  display_name: string;
  role: AccountActivityTeamRole;
  status: AccountActivityTeamStatus;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
};

const TEAM_ROLES = new Set<AccountActivityTeamRole>([
  "manager",
  "sales",
  "content",
  "finance",
  "viewer",
]);

let schemaReady: Promise<void> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function normalizeTeamMobile(value: unknown) {
  if (typeof value !== "string") return "";
  let mobile = value
    .trim()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9+]/g, "");
  if (mobile.startsWith("+98")) mobile = `0${mobile.slice(3)}`;
  if (mobile.startsWith("98") && mobile.length === 12) mobile = `0${mobile.slice(2)}`;
  return /^09[0-9]{9}$/.test(mobile) ? mobile : "";
}

export function normalizeTeamRole(value: unknown): AccountActivityTeamRole {
  const role = String(value || "").trim().toLowerCase() as AccountActivityTeamRole;
  return TEAM_ROLES.has(role) ? role : "viewer";
}

export function teamRoleLabel(role: string) {
  if (role === "manager") return "مدیر";
  if (role === "sales") return "فروش";
  if (role === "content") return "محتوا";
  if (role === "finance") return "مالی";
  return "ناظر";
}

export async function readAccountActivityTeamIdentity(): Promise<AccountActivityTeamIdentity | null> {
  const raw: unknown = await readServerIdentity("/api/me.php");
  if (!isRecord(raw) || raw.success !== true || !isRecord(raw.user)) return null;

  const id = Math.round(Number(raw.user.id || 0));
  const mobile = normalizeTeamMobile(raw.user.mobile);
  if (!Number.isSafeInteger(id) || id <= 0 || !mobile) return null;

  const displayName = String(raw.user.display_name || raw.user.full_name || raw.user.name || "")
    .trim()
    .slice(0, 120);
  return { id, mobile, displayName };
}

export async function ensureAccountActivityTeamSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const d1 = getRuntimeEnv().DB;
      await d1.prepare(`CREATE TABLE IF NOT EXISTS account_activity_members (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        activity_id integer NOT NULL,
        member_user_id integer,
        member_mobile text NOT NULL,
        display_name text DEFAULT '' NOT NULL,
        role text DEFAULT 'viewer' NOT NULL,
        status text DEFAULT 'invited' NOT NULL,
        created_by_user_id integer NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`).run();
      await d1.prepare(
        "CREATE UNIQUE INDEX IF NOT EXISTS account_activity_members_activity_mobile_unique ON account_activity_members (activity_id, member_mobile)",
      ).run();
      await d1.prepare(
        "CREATE INDEX IF NOT EXISTS account_activity_members_user_status_idx ON account_activity_members (member_user_id, status)",
      ).run();
      await d1.prepare(
        "CREATE INDEX IF NOT EXISTS account_activity_members_activity_status_idx ON account_activity_members (activity_id, status)",
      ).run();
      await d1.prepare("SELECT 1 FROM account_activity_members LIMIT 1").run();
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }

  return schemaReady;
}

export async function claimAccountActivityInvites(identity: AccountActivityTeamIdentity) {
  await ensureAccountActivityTeamSchema();
  await getRuntimeEnv().DB
    .prepare(`UPDATE account_activity_members
      SET member_user_id = ?,
          display_name = CASE WHEN display_name = '' THEN ? ELSE display_name END,
          updated_at = CURRENT_TIMESTAMP
      WHERE member_mobile = ?
        AND member_user_id IS NULL
        AND status IN ('invited', 'active')`)
    .bind(identity.id, identity.displayName, identity.mobile)
    .run();
}

function mapMembership(row: Record<string, unknown>): AccountActivityMembership {
  return {
    id: Number(row.id || 0),
    activity_id: Number(row.activity_id || 0),
    member_user_id: row.member_user_id === null || row.member_user_id === undefined
      ? null
      : Number(row.member_user_id || 0),
    member_mobile: String(row.member_mobile || ""),
    display_name: String(row.display_name || ""),
    role: normalizeTeamRole(row.role),
    status: String(row.status || "invited") as AccountActivityTeamStatus,
    created_by_user_id: Number(row.created_by_user_id || 0),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

export async function listAccountActivityMemberships(identity: AccountActivityTeamIdentity) {
  await claimAccountActivityInvites(identity);
  const result = await getRuntimeEnv().DB
    .prepare(`SELECT id, activity_id, member_user_id, member_mobile, display_name, role, status,
      created_by_user_id, created_at, updated_at
      FROM account_activity_members
      WHERE member_user_id = ? AND status IN ('invited', 'active', 'disabled')
      ORDER BY id DESC`)
    .bind(identity.id)
    .all<Record<string, unknown>>();
  return (result.results || []).map(mapMembership);
}

export async function getAccountActivityMembership(
  activityId: number,
  identity: AccountActivityTeamIdentity,
) {
  await claimAccountActivityInvites(identity);
  const row = await getRuntimeEnv().DB
    .prepare(`SELECT id, activity_id, member_user_id, member_mobile, display_name, role, status,
      created_by_user_id, created_at, updated_at
      FROM account_activity_members
      WHERE activity_id = ? AND member_user_id = ?
      LIMIT 1`)
    .bind(activityId, identity.id)
    .first<Record<string, unknown>>();
  return row ? mapMembership(row) : null;
}

export async function listActivityTeam(activityId: number) {
  await ensureAccountActivityTeamSchema();
  const result = await getRuntimeEnv().DB
    .prepare(`SELECT id, activity_id, member_user_id, member_mobile, display_name, role, status,
      created_by_user_id, created_at, updated_at
      FROM account_activity_members
      WHERE activity_id = ? AND status <> 'removed'
      ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'invited' THEN 1 ELSE 2 END, id DESC`)
    .bind(activityId)
    .all<Record<string, unknown>>();
  return (result.results || []).map(mapMembership);
}
