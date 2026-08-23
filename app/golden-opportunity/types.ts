export type GoldenOpportunityStatus =
  | "PENDING_PAYMENT"
  | "AI_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "REFUND_PENDING"
  | "REFUNDED";

export type GoldenOpportunityRequest = {
  listingId: number;
  userId: number;
  province: string;
  cycleDate: string;
  currentPrice: number;
  proposedPrice: number;
  status: GoldenOpportunityStatus;
};

export type GoldenOpportunityReview = {
  score: number;
  approved: boolean;
  reason: string;
};
