import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getDb } from "../../../../db";
import { creditBalances } from "../../../../db/schema";
import { jsonResponse } from "../../../../lib/chakod-auth-proxy";
import { STORY_CREDIT_ASSET } from "../../../../lib/credit-ledger";
import { getFinanceOwnerKey } from "../../../../lib/finance-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای مشاهده اعتبارها وارد شوید." }, 401);
  }

  try {
    const [balance] = await getDb()
      .select({
        assetCode: creditBalances.assetCode,
        availableQuantity: creditBalances.availableQuantity,
      })
      .from(creditBalances)
      .where(
        and(
          eq(creditBalances.ownerKey, ownerKey),
          eq(creditBalances.assetCode, STORY_CREDIT_ASSET),
        ),
      )
      .limit(1);

    return jsonResponse({
      success: true,
      balances: [
        {
          asset_code: STORY_CREDIT_ASSET,
          available_quantity: balance?.availableQuantity || 0,
        },
      ],
    });
  } catch {
    return jsonResponse(
      { success: false, message: "سرویس اعتبارها فعلاً در دسترس نیست." },
      503,
    );
  }
}
