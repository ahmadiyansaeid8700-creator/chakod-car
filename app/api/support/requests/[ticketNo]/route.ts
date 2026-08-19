import { and, eq, sql } from "drizzle-orm";
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
import { getFinanceOwnerKey } from "../../../../../lib/finance-core";
import {
  hashSupportAccess,
  validSupportTicketNo,
} from "../../../../../lib/support-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function authorizeTicket(request: NextRequest, ticketNo: string) {
  const [ticket] = await getDb()
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.ticketNo, ticketNo))
    .limit(1);

  if (!ticket) {
    return { ok: false as const, status: 404, message: "تیکت پشتیبانی پیدا نشد." };
  }

  const ownerKey = (await getFinanceOwnerKey(request)) || "";
  if (ownerKey && ticket.ownerKey && ownerKey === ticket.ownerKey) {
    return { ok: true as const, ticket };
  }

  const access = cleanText(
    request.nextUrl.searchParams.get("access") || request.headers.get("x-support-access"),
    160,
  );
  if (access && ticket.guestAccessHash) {
    const accessHash = await hashSupportAccess(access);
    if (accessHash === ticket.guestAccessHash) {
      return { ok: true as const, ticket };
    }
  }

  return {
    ok: false as const,
    status: 403,
    message: "دسترسی به این تیکت مجاز نیست یا لینک پیگیری معتبر نیست.",
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticketNo: string }> },
) {
  const { ticketNo } = await context.params;
  if (!validSupportTicketNo(ticketNo)) {
    return jsonResponse({ success: false, message: "شماره تیکت معتبر نیست." }, 400);
  }

  try {
    const access = await authorizeTicket(request, ticketNo);
    if (!access.ok) {
      return jsonResponse({ success: false, message: access.message }, access.status);
    }

    const replies = await getDb()
      .select()
      .from(supportReplies)
      .where(eq(supportReplies.ticketId, access.ticket.id))
      .orderBy(supportReplies.id);

    return jsonResponse({
      success: true,
      ticket: {
        ticket_no: access.ticket.ticketNo,
        topic: access.ticket.topic,
        subject: access.ticket.subject,
        message: access.ticket.message,
        order_no: access.ticket.orderNo,
        listing_id: access.ticket.listingId,
        status: access.ticket.status,
        priority: access.ticket.priority,
        last_reply_at: access.ticket.lastReplyAt,
        closed_at: access.ticket.closedAt,
        created_at: access.ticket.createdAt,
        updated_at: access.ticket.updatedAt,
        replies: replies.map((reply) => ({
          id: reply.id,
          author_type: reply.authorType,
          body: reply.body,
          created_at: reply.createdAt,
        })),
      },
    });
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات این تیکت در دسترس نیست." }, 503);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ ticketNo: string }> },
) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const { ticketNo } = await context.params;
  if (!validSupportTicketNo(ticketNo)) {
    return jsonResponse({ success: false, message: "شماره تیکت معتبر نیست." }, 400);
  }

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return jsonResponse({ success: false, message: "متن پاسخ معتبر نیست." }, 400);
  }

  const body = cleanText(input.body, 3000);
  if (body.length < 2) {
    return jsonResponse({ success: false, message: "متن پاسخ را وارد کنید." }, 400);
  }

  try {
    const access = await authorizeTicket(request, ticketNo);
    if (!access.ok) {
      return jsonResponse({ success: false, message: access.message }, access.status);
    }
    if (["closed", "cancelled"].includes(access.ticket.status)) {
      return jsonResponse({ success: false, message: "این تیکت بسته شده و پاسخ جدید نمی پذیرد." }, 409);
    }

    const now = new Date().toISOString();
    await getDb().batch([
      getDb().insert(supportReplies).values({
        ticketId: access.ticket.id,
        authorType: "user",
        body,
      }),
      getDb()
        .update(supportTickets)
        .set({
          status: "waiting_support",
          lastReplyAt: now,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(supportTickets.id, access.ticket.id),
            eq(supportTickets.ticketNo, ticketNo),
          ),
        ),
    ]);

    return jsonResponse({ success: true, message: "پاسخ شما ثبت شد." });
  } catch {
    return jsonResponse({ success: false, message: "ثبت پاسخ انجام نشد." }, 503);
  }
}
