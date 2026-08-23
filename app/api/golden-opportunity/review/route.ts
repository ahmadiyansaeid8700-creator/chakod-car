import { NextResponse } from "next/server";
import { calculateGoldenOpportunityScore } from "@/app/golden-opportunity/review";

export async function POST(req: Request) {
  const data = await req.json();

  const result = calculateGoldenOpportunityScore({
    marketPrice: data.marketPrice,
    opportunityPrice: data.opportunityPrice,
    completeness: data.completeness,
    condition: data.condition,
    mileage: data.mileage,
  });

  return NextResponse.json({
    success: true,
    review: result,
  });
}
