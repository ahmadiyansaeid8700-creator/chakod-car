import { NextResponse } from "next/server";
import type { GoldenOpportunityRequest } from "@/app/golden-opportunity/types";

const requests: GoldenOpportunityRequest[] = [];

const SETTINGS_API = "https://api.chakod.com/api/admin/golden-opportunity-settings.php";

async function getGoldenOpportunityPrice() {
  try {
    const response = await fetch(SETTINGS_API, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return 390000;

    const json = await response.json();
    const settings = json.settings || json.data || json;

    return Number(settings.reviewPrice) || 390000;
  } catch {
    return 390000;
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const amount = await getGoldenOpportunityPrice();

  const item: GoldenOpportunityRequest = {
    id: crypto.randomUUID(),
    adId: body.adId,
    userId: body.userId,
    province: body.province,
    currentPrice: body.currentPrice,
    opportunityPrice: body.opportunityPrice,
    status: "PENDING_PAYMENT",
    createdAt: new Date().toISOString(),
  } as GoldenOpportunityRequest;

  requests.push(item);

  return NextResponse.json({
    success: true,
    request: item,
    paymentRequired: true,
    amount,
  });
}

export async function GET() {
  return NextResponse.json({ success: true, requests });
}
