export type ListingRiskLevel = "low" | "medium" | "high" | "critical";

export type FindingSeverity = "info" | "warning" | "block";

export type ModerationDecision = "auto_approve" | "human_review";

export type ListingModerationInput = {
  listing_id: number;
  title: string;
  description: string;
  category_code?: string;
  brand?: string;
  model?: string;
  production_year?: number;
  mileage_km?: number;
  price_toman?: number;
  province?: string;
  city?: string;
  neighborhood?: string;
  image_urls: string[];
  duplicate_similarity?: number;
};

export type RuleFinding = {
  code: string;
  severity: FindingSeverity;
  title: string;
  detail: string;
};

export type DomainReview = {
  recommended_action: "approve" | "review";
  risk_level: ListingRiskLevel;
  confidence: number;
  risk_score: number;
  summary_fa: string;
  admin_reason_fa: string;
  user_feedback_fa: string;
  flags: string[];
  evidence: string[];
};

export type SafetyReview = {
  flagged: boolean;
  categories: string[];
  scores: Record<string, number>;
};

export type ListingModerationResult = {
  success: true;
  listing_id: number;
  decision: ModerationDecision;
  published: boolean;
  listing_status: "approved" | "pending_admin_review";
  risk_level: ListingRiskLevel;
  risk_score: number;
  confidence: number;
  reason: string;
  admin_notes: string;
  user_feedback: string;
  flags: string[];
  evidence: string[];
  rule_findings: RuleFinding[];
  safety: SafetyReview;
  audit: {
    request_id: string;
    prompt_version: string;
    policy_version: string;
    domain_model: string;
    safety_model: "omni-moderation-latest";
    duration_ms: number;
  };
};

export const DOMAIN_REVIEW_SCHEMA = {
  type: "object",
  properties: {
    recommended_action: {
      type: "string",
      enum: ["approve", "review"],
      description:
        "Approve only when the listing is clearly safe, coherent, and ready to publish. Otherwise review.",
    },
    risk_level: {
      type: "string",
      enum: ["low", "medium", "high", "critical"],
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    risk_score: {
      type: "number",
      minimum: 0,
      maximum: 100,
    },
    summary_fa: {
      type: "string",
      description: "A short Persian summary of the decision.",
    },
    admin_reason_fa: {
      type: "string",
      description:
        "A concise Persian explanation with the exact points an admin must verify.",
    },
    user_feedback_fa: {
      type: "string",
      description:
        "A respectful Persian correction request. Empty when no correction is needed.",
    },
    flags: {
      type: "array",
      items: { type: "string" },
      maxItems: 12,
    },
    evidence: {
      type: "array",
      items: { type: "string" },
      maxItems: 12,
    },
  },
  required: [
    "recommended_action",
    "risk_level",
    "confidence",
    "risk_score",
    "summary_fa",
    "admin_reason_fa",
    "user_feedback_fa",
    "flags",
    "evidence",
  ],
  additionalProperties: false,
} as const;
