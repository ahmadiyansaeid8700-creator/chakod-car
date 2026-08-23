import type { GoldenOpportunityReview } from "./types";

export function reviewGoldenOpportunity(input: {
  marketScore: number;
  discountScore: number;
  qualityScore: number;
}): GoldenOpportunityReview {
  const score = Math.min(
    100,
    input.marketScore + input.discountScore + input.qualityScore
  );

  return {
    score,
    approved: score >= 70,
    reason:
      score >= 70
        ? "آگهی شرایط اولیه فرصت طلایی را دارد."
        : "امتیاز فرصت آگهی به حداقل لازم نرسیده است.",
  };
}
