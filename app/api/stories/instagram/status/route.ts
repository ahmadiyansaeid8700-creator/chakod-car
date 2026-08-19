import { NextRequest } from "next/server";

import { jsonResponse } from "../../../../../lib/chakod-auth-proxy";
import { getFinanceOwnerKey } from "../../../../../lib/finance-core";
import {
  getInstagramQueueForOwner,
  getInstagramStoryCapacitySnapshot,
  publicInstagramPublishingConfig,
} from "../../../../../lib/instagram-story-publishing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validListingId(value: string | null) {
  const id = Number(value || 0);
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

export async function GET(request: NextRequest) {
  const ownerKey = await getFinanceOwnerKey(request);
  if (!ownerKey) {
    return jsonResponse({ success: false, message: "برای مشاهده وضعیت انتشار وارد حساب شوید." }, 401);
  }

  const listingId = validListingId(request.nextUrl.searchParams.get("listing_id"));
  const [queue, capacity] = await Promise.all([
    getInstagramQueueForOwner(ownerKey, listingId || undefined),
    getInstagramStoryCapacitySnapshot(),
  ]);

  return jsonResponse({
    success: true,
    publisher: publicInstagramPublishingConfig(),
    capacity,
    data: queue,
  });
}
