import { PRELAUNCH_BUSINESSES, PRELAUNCH_LISTINGS, PRELAUNCH_SHOWROOMS } from "./prelaunch-fixtures.ts";
import { resolveStagingDemoIdentity } from "./staging-demo-session.ts";

type JsonRecord = Record<string, unknown>;

export type StagingDemoService = {
  service_key: string;
  title: string;
  audience: string;
  amount_toman: number;
  duration_value: number;
  duration_unit: string;
  is_active: boolean;
  settings: Record<string, unknown>;
};

const STAGING_DEMO_SERVICES: StagingDemoService[] = [
  ["listing_personal_publish", "انتشار آگهی شخصی آزمایشی", "personal", 120_000, 30, "day"],
  ["listing_personal_renew", "تمدید آگهی شخصی آزمایشی", "personal", 90_000, 30, "day"],
  ["listing_dealer_publish", "انتشار آگهی نمایشگاهی آزمایشی", "dealer", 180_000, 30, "day"],
  ["listing_dealer_renew", "تمدید آگهی نمایشگاهی آزمایشی", "dealer", 140_000, 30, "day"],
  ["listing_bump", "بالابر آگهی آزمایشی", "all", 65_000, 1, "use"],
  ["listing_featured", "آگهی ویژه آزمایشی", "all", 120_000, 7, "day"],
  ["listing_story", "استوری آگهی آزمایشی", "all", 85_000, 24, "hour"],
  ["professional_profile_6m", "پروفایل حرفه‌ای شش‌ماهه آزمایشی", "business", 2_400_000, 6, "month"],
  ["professional_profile_12m", "پروفایل حرفه‌ای یک‌ساله آزمایشی", "business", 4_200_000, 12, "month"],
  ["business_placement", "جایگاه کسب‌وکار آزمایشی", "business", 900_000, 30, "day"],
  ["dealership_placement", "جایگاه نمایشگاه منتخب آزمایشی", "dealer", 1_500_000, 30, "day"],
  ["home_banner_regular", "جایگاه منتخب استانی آزمایشی", "dealer", 250_000, 1, "day"],
  ["home_banner_large", "جایگاه منتخب استان بزرگ آزمایشی", "dealer", 400_000, 1, "day"],
].map(([serviceKey, title, audience, amount, durationValue, durationUnit]) => ({
  service_key: String(serviceKey),
  title: String(title),
  audience: String(audience),
  amount_toman: Number(amount),
  duration_value: Number(durationValue),
  duration_unit: String(durationUnit),
  is_active: true,
  settings: { staging_demo: true },
}));

const STAGING_DEMO_PROVINCES = [
  { province: "تهران", is_large: true },
  { province: "البرز", is_large: true },
  { province: "اصفهان", is_large: true },
  { province: "فارس", is_large: false },
  { province: "گیلان", is_large: false },
].map((item) => ({
  ...item,
  story_price_toman: item.is_large ? 110_000 : 80_000,
  story_duration_hours: 24,
  story_is_active: true,
  banner_price_toman: item.is_large ? 400_000 : 250_000,
  banner_day_capacity: 6,
  banner_is_active: true,
}));

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function positiveId(value: unknown) {
  const id = Math.round(Number(value || 0));
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function demoListing(item: JsonRecord) {
  const dealerId = positiveId(item.dealer_id);
  return {
    id: positiveId(item.id),
    title: text(item.title),
    status: "active",
    moderation_status: "approved",
    listing_owner_type: dealerId ? "dealer" : "personal",
    dealer_id: dealerId || null,
    province: text(item.province),
    city: text(item.city),
    expires_at: "2027-01-01T00:00:00.000Z",
    last_bumped_at: null,
  };
}

function demoDealer(user: JsonRecord) {
  const accountType = text(user.account_type);
  if (accountType === "personal") return null;

  if (accountType === "dealer") {
    const showroom = PRELAUNCH_SHOWROOMS[0] as unknown as JsonRecord;
    return {
      dealer_id: positiveId(showroom.id),
      dealer_name: text(user.business_name) || text(showroom.name),
      role: "owner",
      permissions: ["business:read", "business:manage", "listing:manage"],
    };
  }

  const businesses = PRELAUNCH_BUSINESSES as unknown as JsonRecord[];
  const business = businesses.find((item) => text(item.business_type) === accountType) || businesses[0];
  return {
    dealer_id: positiveId(business?.id),
    dealer_name: text(user.business_name) || text(business?.name),
    role: "owner",
    permissions: ["business:read", "business:manage", "listing:manage"],
  };
}

export function buildStagingDemoCommerce(input: { hostname: string; token: string }) {
  const identity = resolveStagingDemoIdentity({
    hostname: input.hostname,
    token: input.token,
    endpoint: "/api/me.php",
  });
  if (!identity || identity.success !== true || identity.staging_demo !== true || !isRecord(identity.user)) {
    return null;
  }

  const user = identity.user;
  const dealer = demoDealer(user);
  const fixtures = PRELAUNCH_LISTINGS as unknown as JsonRecord[];
  const listings = fixtures
    .filter((item) => {
      const dealerId = positiveId(item.dealer_id);
      if (!dealer) return dealerId === 0;
      return dealerId === dealer.dealer_id;
    })
    .map(demoListing);

  return {
    success: true as const,
    staging_demo: true as const,
    message: "کاتالوگ آزمایشی استیجینگ؛ هیچ پرداخت واقعی انجام نمی‌شود.",
    user: {
      id: positiveId(user.id),
      account_type: text(user.account_type) || "personal",
      display_name: text(user.display_name) || text(user.full_name) || "کاربر آزمایشی چاکود",
    },
    services: STAGING_DEMO_SERVICES.map((service) => ({ ...service, settings: { ...service.settings } })),
    provinces: STAGING_DEMO_PROVINCES.map((province) => ({ ...province })),
    listings,
    dealers: dealer ? [dealer] : [],
    orders: [] as JsonRecord[],
    subscriptions: [] as JsonRecord[],
    payment_gateway_ready: true,
  };
}

export function quoteStagingDemoService(serviceKey: string, discountCode: string) {
  const service = STAGING_DEMO_SERVICES.find((item) => item.service_key === serviceKey);
  if (!service) return null;

  const amountToman = service.amount_toman;
  const normalizedDiscount = discountCode.trim().toUpperCase();
  const discountToman = normalizedDiscount === "TEST10" ? Math.round(amountToman * 0.1) : 0;
  return {
    service,
    amountToman,
    discountToman,
    finalAmountToman: amountToman - discountToman,
    discountCode: discountToman ? "TEST10" : "",
  };
}

export function isStagingDemoOrderMetadata(metadataJson: string) {
  try {
    const metadata: unknown = JSON.parse(metadataJson);
    return isRecord(metadata) && metadata.staging_demo === true;
  } catch {
    return false;
  }
}
