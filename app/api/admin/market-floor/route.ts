import { desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "../../../../db";
import { marketFloorEntries, marketFloorWallets } from "../../../../db/schema";
import { jsonResponse, rejectCrossSiteMutation } from "../../../../lib/chakod-auth-proxy";
import { readServerIdentity } from "../../../../lib/server-route-access";

export const dynamic = "force-dynamic";

async function adminAccess() {
  const identity = await readServerIdentity("/api/admin-me.php") as Record<string, unknown> | null;
  return identity?.success === true && identity?.is_admin === true ? identity : null;
}

export async function GET() {
  if (!await adminAccess()) return jsonResponse({ success: false, message: "دسترسی مدیریت لازم است." }, 403);
  const rows = await getDb().select().from(marketFloorEntries).orderBy(desc(marketFloorEntries.id)).limit(300);
  return jsonResponse({ success: true, data: rows.map((row) => ({ ...row, listing: JSON.parse(row.listingSnapshotJson), score_parts: JSON.parse(row.scoreJson) })) });
}

export async function PATCH(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  const admin = await adminAccess();
  if (!admin) return jsonResponse({ success: false, message: "دسترسی مدیریت لازم است." }, 403);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = Math.round(Number(input.id || 0));
  const action = String(input.action || "");
  const allowed = new Set(["approve", "reject", "waitlist", "cancel"]);
  if (!id || !allowed.has(action)) return jsonResponse({ success: false, message: "عملیات معتبر نیست." }, 400);
  const db = getDb();
  const [entry] = await db.select().from(marketFloorEntries).where(eq(marketFloorEntries.id, id)).limit(1);
  if (!entry) return jsonResponse({ success: false, message: "درخواست پیدا نشد." }, 404);
  const now = new Date().toISOString();
  const status = action === "approve" ? "active" : action === "waitlist" ? "waitlisted" : action === "cancel" ? "cancelled" : "rejected";
  let cardState = entry.cardState;
  if ((status === "rejected" || status === "cancelled") && entry.cardState === "consumed") {
    const [wallet] = await db.select().from(marketFloorWallets).where(eq(marketFloorWallets.ownerKey, entry.ownerKey)).limit(1);
    if (wallet) await db.update(marketFloorWallets).set({ availableCards: wallet.availableCards + 1, consumedCards: Math.max(0, wallet.consumedCards - 1), refundedCards: wallet.refundedCards + 1, updatedAt: now }).where(eq(marketFloorWallets.id, wallet.id));
    cardState = "refunded";
  }
  await db.update(marketFloorEntries).set({ status, decision: action === "approve" ? "approved" : action === "reject" ? "rejected" : entry.decision, reason: String(input.reason || entry.reason).slice(0, 600), cardState, reviewedBy: String((admin.admin as Record<string, unknown> | undefined)?.email || "admin"), reviewedAt: now, activatedAt: status === "active" ? now : entry.activatedAt, updatedAt: now }).where(eq(marketFloorEntries.id, id));
  return jsonResponse({ success: true, message: "وضعیت کف بازار به‌روزرسانی شد." });
}
