import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "../db";
import { wallets } from "../db/schema";
import { readSessionToken } from "./chakod-auth-proxy";

const FINANCE_SCOPE_COOKIE = "chakod_finance_account_scope";

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeFinanceScope(value: string | undefined) {
  const scope = String(value || "personal").trim();
  if (scope === "personal") return "personal";
  if (/^(activity|membership):[1-9][0-9]*$/.test(scope)) return scope;
  return "personal";
}

export function getFinanceAccountScope(request: NextRequest) {
  return normalizeFinanceScope(request.cookies.get(FINANCE_SCOPE_COOKIE)?.value);
}

export async function getFinanceOwnerKey(request: NextRequest) {
  const token = readSessionToken(request);
  if (!token) return null;

  const scope = getFinanceAccountScope(request);
  // Keep the historical personal wallet key unchanged so any existing personal
  // balance remains attached to the personal account. Business scopes receive
  // independent keys and never inherit or move that balance automatically.
  const source = scope === "personal"
    ? `chakod-finance:${token}`
    : `chakod-finance:${token}:${scope}`;
  const payload = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return bytesToHex(new Uint8Array(digest));
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
