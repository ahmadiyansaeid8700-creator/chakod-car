import { desc, eq, inArray, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../../db";
import {
  supportReplies,
  supportTickets,
} from "../../../../../db/schema";
import {
  jsonResponse,
  rejectCrossSiteMutation,
} from "../../../../../lib/chakod-auth-proxy";
import { readServerIdentity } from "../../../../../lib/server-route-access";
import { validSupportTicketNo } from "../../../../../lib/support-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = new Set([
  "open",
  "in_progress",
  "waiting_user",
  "waiting_support",
  "resolved",
  "closed",
]);
const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function requireAdmin() {
  const identity = await readServerIdentity("/api/admin-me.php");
  return identity?.success === true && identity.is_admin === true;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return jsonResponse({ success: false, message: "دسترسی مدیریت پشتیبانی مجاز نیست." }, 403);
  }

  try {
    const db = getDb();
    const tickets = await db
      .select()
      .from(supportTickets)
      .orderBy(desc(supportTickets.id))
      .limit(200);
    const ids = tickets.map((item) => item.id);
    const replies = ids.length
      ? await db
          .select()
          .from(supportReplies)
          .where(inArray(supportReplies.ticketId, ids))
          .orderBy(supportReplies.id)
      : [];
    const replyMap = new Map<number, typeof replies>();
    for (const reply of replies) {
      const current = replyMap.get(reply.ticketId) || [];
      current.push(reply);
      replyMap.set(reply.ticketId, current);
    }

    return jsonResponse({
      success: true,
      tickets: tickets.map((ticket) => ({
        ticket_no: ticket.ticketNo,
        full_name: ticket.fullName,
        mobile: ticket.mobile,
        email: ticket.email,
        is_guest: !ticket.ownerKey,
        topic: ticket.topic,
        subject: ticket.subject,
        message: ticket.message,
        order_no: ticket.orderNo,
        listing_id: ticket.listingId,
        status: ticket.status,
        priority: ticket.priority,
        admin_note: ticket.adminNote,
        last_reply_at: ticket.lastReplyAt,
        closed_at: ticket.closedAt,
        created_at: ticket.createdAt,
        updated_at: ticket.updatedAt,
        replies: (replyMap.get(ticket.id) || []).map((reply) => ({
          id: reply.id,
          author_type: reply.authorType,
          body: reply.body,
          created_at: reply.createdAt,
        })),
      })),
    });
  } catch {
    return jsonResponse({ success: false, message: "فهرست تیکت های پشتیبانی در دسترس نیست." }, 503);
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  if (!(await requireAdmin())) {
    return jsonResponse({ success: false, message: "دسترسی مدیریت پشتیبانی مجاز نیست." }, 403);
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

  const ticketNo = cleanText(input.ticket_no, 100);
  const action = cleanText(input.action, 30);
  const body = cleanText(input.body, 3000);
  const status = cleanText(input.status, 30);
  const priority = cleanText(input.priority, 20);
  const adminNote = cleanText(input.admin_note, 1000);

  if (!validSupportTicketNo(ticketNo)) {
    return jsonResponse({ success: false, message: "شماره تیکت معتبر نیست." }, 400);
  }
  if (!["reply", "update", "close", "reopen"].includes(action)) {
    return jsonResponse({ success: false, message: "عملیات پشتیبانی معتبر نیست." }, 400);
  }

  try {
    const db = getDb();
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.ticketNo, ticketNo))
      .limit(1);

    if (!ticket) {
      return jsonResponse({ success: false, message: "تیکت پیدا نشد." }, 404);
    }

    if (action === "reply") {
      if (body.length < 2) {
        return jsonResponse({ success: false, message: "متن پاسخ را وارد کنید." }, 400);
      }
      if (ticket.status === "closed") {
        return jsonResponse({ success: false, message: "تیکت بسته است؛ ابتدا آن را باز کنید." }, 409);
      }

      const now = new Date().toISOString();
      await db.batch([
        db.insert(supportReplies).values({
          ticketId: ticket.id,
          authorType: "admin",
          body,
        }),
        db
          .update(supportTickets)
          .set({
            status: "waiting_user",
            lastReplyAt: now,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(supportTickets.id, ticket.id)),
      ]);
      return jsonResponse({ success: true, message: "پاسخ پشتیبانی ارسال شد." });
    }

    if (action === "close") {
      await db
        .update(supportTickets)
        .set({
          status: "closed",
          adminNote,
          closedAt: new Date().toISOString(),
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(supportTickets.id, ticket.id));
      return jsonResponse({ success: true, message: "تیکت بسته شد." });
    }

    if (action === "reopen") {
      await db
        .update(supportTickets)
        .set({
          status: "in_progress",
          closedAt: null,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(supportTickets.id, ticket.id));
      return jsonResponse({ success: true, message: "تیکت دوباره باز شد." });
    }

    if (status && !STATUSES.has(status)) {
      return jsonResponse({ success: false, message: "وضعیت تیکت معتبر نیست." }, 400);
    }
    if (priority && !PRIORITIES.has(priority)) {
      return jsonResponse({ success: false, message: "اولویت تیکت معتبر نیست." }, 400);
    }

    await db
      .update(supportTickets)
      .set({
        status: status || ticket.status,
        priority: priority || ticket.priority,
        adminNote,
        closedAt: status === "closed" ? new Date().toISOString() : status ? null : ticket.closedAt,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(supportTickets.id, ticket.id));

    return jsonResponse({ success: true, message: "تنظیمات تیکت به روز شد." });
  } catch {
    return jsonResponse({ success: false, message: "عملیات مدیریت تیکت انجام نشد." }, 503);
  }
}
