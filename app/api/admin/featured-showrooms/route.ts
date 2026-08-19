import { and, desc, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import {
  commerceOrders,
  featuredShowroomPlacements,
} from "../../../../db/schema";
import {
  jsonResponse,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";
import { readServerIdentity } from "../../../../lib/server-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function requireAdmin() {
  const identity = await readServerIdentity("/api/admin-me.php");
  return identity?.success === true && identity.is_admin === true;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return jsonResponse({ success: false, message: "دسترسی مدیریت نمایشگاه منتخب مجاز نیست." }, 403);
  }

  try {
    const rows = await getDb()
      .select({
        id: featuredShowroomPlacements.id,
        order_id: featuredShowroomPlacements.orderId,
        owner_key: featuredShowroomPlacements.ownerKey,
        dealer_id: featuredShowroomPlacements.dealerId,
        dealer_name: featuredShowroomPlacements.dealerName,
        province: featuredShowroomPlacements.province,
        start_date: featuredShowroomPlacements.startDate,
        end_date: featuredShowroomPlacements.endDate,
        reserved_days: featuredShowroomPlacements.reservedDays,
        daily_rate_toman: featuredShowroomPlacements.dailyRateToman,
        total_price_toman: featuredShowroomPlacements.totalPriceToman,
        status: featuredShowroomPlacements.status,
        admin_note: featuredShowroomPlacements.adminNote,
        approved_at: featuredShowroomPlacements.approvedAt,
        created_at: featuredShowroomPlacements.createdAt,
        order_no: commerceOrders.orderNo,
        order_status: commerceOrders.status,
        order_amount_toman: commerceOrders.finalAmountToman,
      })
      .from(featuredShowroomPlacements)
      .leftJoin(commerceOrders, eq(commerceOrders.id, featuredShowroomPlacements.orderId))
      .orderBy(desc(featuredShowroomPlacements.id))
      .limit(150);

    return jsonResponse({ success: true, placements: rows });
  } catch {
    return jsonResponse(
      { success: false, message: "فهرست مدیریت نمایشگاه های منتخب در دسترس نیست." },
      503,
    );
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  if (!(await requireAdmin())) {
    return jsonResponse({ success: false, message: "دسترسی مدیریت نمایشگاه منتخب مجاز نیست." }, 403);
  }

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return jsonResponse({ success: false, message: "درخواست مدیریت معتبر نیست." }, 400);
  }

  const placementId = Math.round(Number(input.placement_id || 0));
  const action = cleanText(input.action, 30);
  const adminNote = cleanText(input.admin_note, 500);

  if (!Number.isSafeInteger(placementId) || placementId <= 0) {
    return jsonResponse({ success: false, message: "شناسه رزرو معتبر نیست." }, 400);
  }
  if (!["approve", "reject", "cancel"].includes(action)) {
    return jsonResponse({ success: false, message: "عملیات مدیریت معتبر نیست." }, 400);
  }

  try {
    const db = getDb();
    const [placement] = await db
      .select()
      .from(featuredShowroomPlacements)
      .where(eq(featuredShowroomPlacements.id, placementId))
      .limit(1);

    if (!placement) {
      return jsonResponse({ success: false, message: "رزرو نمایشگاه منتخب پیدا نشد." }, 404);
    }

    const [order] = await db
      .select()
      .from(commerceOrders)
      .where(eq(commerceOrders.id, placement.orderId))
      .limit(1);

    if (action === "approve") {
      if (!order || order.status !== "paid") {
        return jsonResponse({ success: false, message: "فقط سفارش پرداخت شده قابل تایید است." }, 409);
      }
      if (!["pending_review", "rejected"].includes(placement.status)) {
        return jsonResponse({ success: false, message: "این رزرو در وضعیت قابل تایید نیست." }, 409);
      }

      await db
        .update(featuredShowroomPlacements)
        .set({
          status: "approved",
          adminNote,
          approvedAt: new Date().toISOString(),
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(featuredShowroomPlacements.id, placement.id),
            eq(featuredShowroomPlacements.orderId, placement.orderId),
          ),
        );

      return jsonResponse({ success: true, message: "نمایشگاه برای جایگاه منتخب تایید شد." });
    }

    if (action === "reject") {
      if (!["pending_review", "approved"].includes(placement.status)) {
        return jsonResponse({ success: false, message: "این رزرو در وضعیت قابل رد نیست." }, 409);
      }

      await db
        .update(featuredShowroomPlacements)
        .set({
          status: "rejected",
          adminNote,
          approvedAt: null,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(featuredShowroomPlacements.id, placement.id));

      return jsonResponse({ success: true, message: "رزرو نمایشگاه منتخب رد شد." });
    }

    await db
      .update(featuredShowroomPlacements)
      .set({
        status: "cancelled",
        adminNote,
        approvedAt: null,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(featuredShowroomPlacements.id, placement.id));

    return jsonResponse({ success: true, message: "جایگاه نمایشگاه منتخب لغو شد." });
  } catch {
    return jsonResponse({ success: false, message: "تغییر وضعیت رزرو انجام نشد." }, 503);
  }
}
