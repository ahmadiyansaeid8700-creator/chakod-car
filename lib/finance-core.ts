import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "../db";
import { wallets } from "../db/schema";
import { readSessionToken } from "./chakod-auth-proxy";

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getFinanceOwnerKey(request: NextRequest) {
  const token = readSessionToken(request);
  if (!token) return null;

  const payload = new TextEncoder().encode(`chakod-finance:${token}`);
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
