import { NextResponse } from "next/server";
import type { GoldenOpportunityRequest } from "@/app/golden-opportunity/types";

const requests: GoldenOpportunityRequest[] = [];

export async function POST(req: Request) {
  const body = await req.json();

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
    amount: 390000,
  });
}

export async function GET() {
  return NextResponse.json({ success: true, requests });
}
