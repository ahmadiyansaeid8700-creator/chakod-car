import { desc, eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import {
  supportReplies,
  supportTickets,
} from "../../../../db/schema";
import {
  jsonResponse,
  rejectCrossSiteMutation,
} from "../../../../lib/chakod-auth-proxy";
import {
  createPublicReference,
  getFinanceOwnerKey,
} from "../../../../lib/finance-core";
import {
  createSupportAccessToken,
  hashSupportAccess,
} from "../../../../lib/support-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOPICS = new Set([
  "account",
  "listing",
  "payment",
  "business",
  "technical",
  "report",
  "other",
]);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeMobile(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9+]/g, "")
    .slice(0, 16);
}

function validEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validMobile(value: string) {
  return !value || /^\+?\d{10,15}$/.test(value);
}

export async function GET(request: NextRequest) {
  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای مشاهده تیکت های حساب وارد شوید." }, 401);
  }

  try {
    const db = getDb();
    const tickets = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.ownerKey, ownerKey))
      .orderBy(desc(supportTickets.id))
      .limit(50);

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
        topic: ticket.topic,
        subject: ticket.subject,
        message: ticket.message,
        order_no: ticket.orderNo,
        listing_id: ticket.listingId,
        status: ticket.status,
        priority: ticket.priority,
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
    return jsonResponse({ success: false, message: "تیکت های پشتیبانی در دسترس نیستند." }, 503);
  }
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const ownerKey = (await getFinanceOwnerKey(request)) || "";

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return jsonResponse({ success: false, message: "اطلاعات درخواست پشتیبانی معتبر نیست." }, 400);
  }

  const topic = cleanText(input.topic, 40) || "other";
  const subject = cleanText(input.subject, 180);
  const message = cleanText(input.message, 3000);
  const fullName = cleanText(input.full_name, 120);
  const mobile = normalizeMobile(cleanText(input.mobile, 30));
  const email = cleanText(input.email, 180).toLowerCase();
  const orderNo = cleanText(input.order_no, 100);
  const listingIdInput = Math.round(Number(input.listing_id || 0));
  const listingId = Number.isSafeInteger(listingIdInput) && listingIdInput > 0 ? listingIdInput : null;

  if (!TOPICS.has(topic)) {
    return jsonResponse({ success: false, message: "موضوع پشتیبانی معتبر نیست." }, 400);
  }
  if (subject.length < 4) {
    return jsonResponse({ success: false, message: "عنوان درخواست را کامل تر بنویسید." }, 400);
  }
  if (message.length < 10) {
    return jsonResponse({ success: false, message: "شرح مشکل را با جزئیات بیشتری بنویسید." }, 400);
  }
  if (!validEmail(email) || !validMobile(mobile)) {
    return jsonResponse({ success: false, message: "شماره موبایل یا ایمیل معتبر نیست." }, 400);
  }
  if (!ownerKey && (fullName.length < 2 || (!mobile && !email))) {
    return jsonResponse(
      { success: false, message: "برای درخواست مهمان، نام و حداقل یک راه تماس وارد کنید." },
      400,
    );
  }

  try {
    const ticketNo = createPublicReference("SUP");
    const guestAccess = ownerKey ? "" : createSupportAccessToken();
    const guestAccessHash = guestAccess ? await hashSupportAccess(guestAccess) : "";

    const [ticket] = await getDb()
      .insert(supportTickets)
      .values({
        ticketNo,
        ownerKey,
        guestAccessHash,
        fullName,
        mobile,
        email,
        topic,
        subject,
        message,
        orderNo,
        listingId,
        status: "open",
        priority: "normal",
      })
      .returning();

    const trackingUrl = ownerKey
      ? `/support/tickets/${encodeURIComponent(ticket.ticketNo)}`
      : `/support/tickets/${encodeURIComponent(ticket.ticketNo)}?access=${encodeURIComponent(guestAccess)}`;

    return jsonResponse(
      {
        success: true,
        message: "درخواست پشتیبانی ثبت شد.",
        ticket: {
          ticket_no: ticket.ticketNo,
          status: ticket.status,
          tracking_url: trackingUrl,
        },
      },
      201,
    );
  } catch {
    return jsonResponse({ success: false, message: "ثبت درخواست پشتیبانی انجام نشد." }, 503);
  }
}
