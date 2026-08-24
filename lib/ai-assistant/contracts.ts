export type AssistantMode = "user" | "admin";

export type AssistantIntent =
  | "social_greeting"
  | "vehicle_maintenance"
  | "vehicle_diagnostics"
  | "vehicle_search"
  | "listing_comparison"
  | "price_analysis"
  | "listing_review"
  | "selling_help"
  | "business_setup"
  | "site_operations"
  | "moderation_queue"
  | "growth_analysis"
  | "general";

export type AssistantConfidence = "high" | "medium" | "low";

export type AssistantDataStatus = "live" | "partial" | "unavailable";

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantPageContext = {
  path: string;
  title: string;
  locationLabel?: string;
  locationProvince?: string;
  locationCities?: string[];
};

export type AssistantAction = {
  label: string;
  href: string;
};

export type AssistantResultCard = {
  kind: "listing" | "admin_listing";
  id: number;
  title: string;
  href: string;
  price_toman: number | null;
  badge: string;
  tone: "neutral" | "good" | "warning" | "danger";
  facts: string[];
};

export type AssistantReply = {
  success: true;
  configured: boolean;
  mode: AssistantMode;
  intent: AssistantIntent;
  confidence: AssistantConfidence;
  data_status: AssistantDataStatus;
  data_notice: string;
  reply: string;
  suggestions: string[];
  actions: AssistantAction[];
  cards: AssistantResultCard[];
};

export type PublicListingContext = {
  id: number;
  title: string;
  brand: string;
  model: string;
  year: number | null;
  mileage_km: number | null;
  price_toman: number | null;
  location: string;
  body_status: string;
  transmission: string;
  fuel_type: string;
  seller_type: string;
  views_count: number | null;
  href: string;
};

export type PublicSearchIntent = {
  q: string;
  province: string;
  city: string;
  brand: string;
  model: string;
  min_price: number | null;
  max_price: number | null;
  min_year: number | null;
  max_year: number | null;
  max_mileage: number | null;
  transmission: string;
  fuel_type: string;
  seller_type: string;
  sort: string;
  relaxed: boolean;
};

export type MarketIntelligence = {
  sample_size: number;
  priced_sample_size: number;
  median_price_toman: number | null;
  min_price_toman: number | null;
  max_price_toman: number | null;
  affordable_count: number;
  current_listing_position:
    | "below_market"
    | "near_market"
    | "above_market"
    | "unknown";
};

export type AdminListingContext = {
  id: number;
  title: string;
  status: string;
  moderation_status: string;
  risk_level: string;
  risk_score: number | null;
  moderation_reason: string;
  owner_type: string;
  created_at: string;
  age_days: number | null;
  href: string;
  priority_score: number;
  priority_reasons: string[];
};

export type AdminOperationalInsights = {
  risk_counts: Record<string, number>;
  age_buckets: {
    fresh: number;
    waiting: number;
    stale: number;
  };
  owner_type_counts: Record<string, number>;
  critical_total: number;
  stale_total: number;
  needs_edit_total: number;
  workload_score: number;
};

export type AssistantKnowledge =
  | {
      mode: "user";
      page: AssistantPageContext;
      catalog: {
        total: number;
        query: PublicSearchIntent;
        listings: PublicListingContext[];
        detail: Record<string, unknown> | null;
        data_status: "ready" | "unavailable";
      };
      market: MarketIntelligence;
    }
  | {
      mode: "admin";
      page: AssistantPageContext;
      admin: {
        display_name: string;
        role: string;
        permissions: string[];
      };
      operations: {
        stats: Record<string, number>;
        pending_total: number;
        approved_total: number;
        attention_queue: AdminListingContext[];
        recently_approved: AdminListingContext[];
        insights: AdminOperationalInsights;
        data_status: "ready" | "partial" | "unavailable";
      };
    };

export const ASSISTANT_REPLY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: {
      type: "string",
      description:
        "A concise, useful Persian answer. Use short paragraphs or Persian bullets when helpful.",
    },
    suggestions: {
      type: "array",
      maxItems: 4,
      items: {
        type: "string",
      },
    },
    actions: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          href: { type: "string" },
        },
        required: ["label", "href"],
      },
    },
    highlight_ids: {
      type: "array",
      maxItems: 5,
      items: {
        type: "integer",
      },
    },
    intent: {
      type: "string",
      enum: [
        "social_greeting",
        "vehicle_maintenance",
        "vehicle_diagnostics",
        "vehicle_search",
        "listing_comparison",
        "price_analysis",
        "listing_review",
        "selling_help",
        "business_setup",
        "site_operations",
        "moderation_queue",
        "growth_analysis",
        "general",
      ],
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
    },
  },
  required: [
    "reply",
    "suggestions",
    "actions",
    "highlight_ids",
    "intent",
    "confidence",
  ],
} as const;
