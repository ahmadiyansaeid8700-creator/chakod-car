import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getDb } from "../../../../../../db";
import { businessVerificationRequests } from "../../../../../../db/schema";
import { readVerificationAdmin } from "../../../../../../lib/business-verification-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await readVerificationAdmin();
  if (!admin.allowed) {
    return NextResponse.json(
      { success: false, message: "دسترسی مشاهده مدرک مجاز نیست." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const params = await context.params;
  const id = Math.round(Number(params.id || 0));
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json(
      { success: false, message: "شناسه پرونده معتبر نیست." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const [row] = await getDb()
      .select({
        documentBase64: businessVerificationRequests.documentBase64,
        documentMime: businessVerificationRequests.documentMime,
        documentName: businessVerificationRequests.documentName,
      })
      .from(businessVerificationRequests)
      .where(eq(businessVerificationRequests.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { success: false, message: "مدرک پیدا نشد." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const bytes = Buffer.from(row.documentBase64, "base64");
    const safeName = row.documentName.replace(/[\r\n"\\/]/g, "-") || `verification-${id}`;
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": row.documentMime,
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "مدرک در دسترس نیست." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
