import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "../db";
import { accountActivities, wallets } from "../db/schema";
import { readSessionToken } from "./chakod-auth-proxy";
import { readServerIdentity } from "./server-route-access";

const FINANCE_SCOPE_COOKIE = "chakod_finance_account_scope";

export type FinanceAccount = {
  scope: string;
  kind: "personal" | "activity";
  id: number | null;
  type: string;
  name: string;
  ownerKey: string;
  verificationStatus: string;
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeFinanceScope(value: string | undefined) {
  const scope = String(value || "personal").trim();
  if (scope === "personal") return "personal";
  if (/^(activity|membership):[1-9][0-9]*$/.test(scope)) return scope;
  return "personal";
}

async function hashFinanceSource(source: string) {
  const payload = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return bytesToHex(new Uint8Array(digest));
}

async function ownerKeyForScope(token: string, scope: string) {
  // Keep all existing wallet keys compatible. Access to non-personal scopes is
  // now validated server-side before this key is ever returned.
  const source = scope === "personal"
    ? `chakod-finance:${token}`
    : `chakod-finance:${token}:${scope}`;
  return hashFinanceSource(source);
}

function identityUserId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  const record = value as Record<string, unknown>;
  if (record.success !== true || !record.user || typeof record.user !== "object" || Array.isArray(record.user)) {
    return 0;
  }
  const user = record.user as Record<string, unknown>;
  const id = Math.round(Number(user.id || 0));
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

export function getFinanceAccountScope(request: NextRequest) {
  return normalizeFinanceScope(request.cookies.get(FINANCE_SCOPE_COOKIE)?.value);
}

export async function listOwnedFinanceAccounts(request: NextRequest): Promise<FinanceAccount[]> {
  const token = readSessionToken(request);
  if (!token) return [];

  const personal: FinanceAccount = {
    scope: "personal",
    kind: "personal",
    id: null,
    type: "personal",
    name: "حساب شخصی",
    ownerKey: await ownerKeyForScope(token, "personal"),
    verificationStatus: "verified",
  };

  const identity = await readServerIdentity("/api/me.php");
  const userId = identityUserId(identity);
  if (!userId) return [personal];

  try {
    const rows = await getDb()
      .select({
        id: accountActivities.id,
        activityType: accountActivities.activityType,
        name: accountActivities.name,
        status: accountActivities.status,
        verificationStatus: accountActivities.verificationStatus,
      })
      .from(accountActivities)
      .where(eq(accountActivities.ownerUserId, userId))
      .orderBy(accountActivities.id);

    const owned = await Promise.all(
      rows
        .filter((row) => row.status !== "disabled")
        .map(async (row): Promise<FinanceAccount> => {
          const scope = `activity:${row.id}`;
          return {
            scope,
            kind: "activity",
            id: row.id,
            type: row.activityType,
            name: row.name || "کسب‌وکار",
            ownerKey: await ownerKeyForScope(token, scope),
            verificationStatus: row.verificationStatus,
          };
        }),
    );

    return [personal, ...owned];
  } catch {
    // A finance request must never trust the browser's business scope when the
    // ownership table is unavailable. Personal wallet access can still work.
    return [personal];
  }
}

export async function getFinanceOwnerKey(request: NextRequest) {
  const scope = getFinanceAccountScope(request);
  const accounts = await listOwnedFinanceAccounts(request);
  return accounts.find((account) => account.scope === scope)?.ownerKey || null;
}

export async function ensureWallet(ownerKey: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.ownerKey, ownerKey))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(wallets)
    .values({ ownerKey })
    .returning();

  return created;
}

export function createPublicReference(prefix: string) {
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `${prefix}-${Date.now()}-${random}`;
}
