import { createHash } from "node:crypto";

export const STAGING_DEMO_CODE = "11111";

const DEMO_ACCOUNT_TYPES = [
  "personal",
  "dealer",
  "parts_store",
  "repair_shop",
  "car_service",
] as const;

type DemoAccountType = (typeof DEMO_ACCOUNT_TYPES)[number];
type IdentityEndpoint = "/api/me.php" | "/api/admin-me.php";

const DEMO_PROFILES: Record<DemoAccountType, Array<{ fullName: string; businessName?: string; city: string }>> = {
  personal: [
    { fullName: "سعید احمدی", city: "تهران" },
    { fullName: "علی رضایی", city: "کرج" },
    { fullName: "مهدی کریمی", city: "اصفهان" },
  ],
  dealer: [
    { fullName: "امیر رضایی", businessName: "اتوگالری آریا", city: "تهران" },
    { fullName: "سامان کریمی", businessName: "نمایشگاه پارس", city: "شیراز" },
    { fullName: "نیما اکبری", businessName: "خودرو کاسپین", city: "بندر انزلی" },
  ],
  parts_store: [
    { fullName: "حسین مرادی", businessName: "یدک آریا", city: "کرج" },
    { fullName: "رضا شریفی", businessName: "قطعه‌سرای پارس", city: "مشهد" },
    { fullName: "مجتبی نادری", businessName: "لوازم خودرو شرق", city: "تهران" },
  ],
  repair_shop: [
    { fullName: "احسان احمدی", businessName: "تعمیرگاه دنا", city: "اصفهان" },
    { fullName: "پویان اکبری", businessName: "تعمیرگاه پارس موتور", city: "تهران" },
    { fullName: "محمد رضایی", businessName: "مرکز فنی آریا", city: "ساری" },
  ],
  car_service: [
    { fullName: "آرش محمدی", businessName: "دیتیلینگ وان", city: "تهران" },
    { fullName: "میلاد مرادی", businessName: "خدمات خودرو سپید", city: "شیراز" },
    { fullName: "بردیا حسینی", businessName: "اتوکلینیک آریا", city: "کرج" },
  ],
};

function normalizeHostname(value: string) {
  const hostname = String(value || "").trim().toLowerCase();
  return hostname.split(":", 1)[0] || "";
}

export function isStagingDemoEnabled(hostname: string) {
  return (
    process.env.PRELAUNCH_FIXTURES === "true" &&
    normalizeHostname(hostname) === "staging.chakod.com"
  );
}

function demoAccountType(mobile: string): DemoAccountType {
  const lastDigit = Number(mobile.slice(-1));
  return DEMO_ACCOUNT_TYPES[lastDigit >= 0 && lastDigit <= 4 ? lastDigit : 0];
}

function demoProfileIndex(mobile: string) {
  const tensDigit = Number(mobile.slice(-2, -1));
  if (tensDigit === 2) return 1;
  if (tensDigit === 3) return 2;
  return 0;
}

function demoUserId(mobile: string) {
  return 990_000_000 + Number(mobile.slice(-6));
}

export function buildStagingDemoUser(mobile: string) {
  const accountType = demoAccountType(mobile);
  const profile = DEMO_PROFILES[accountType][demoProfileIndex(mobile)];
  const masked = `${mobile.slice(0, 4)}***${mobile.slice(-4)}`;

  return {
    id: demoUserId(mobile),
    mobile,
    mobile_masked: masked,
    full_name: profile.fullName,
    display_name: accountType === "personal" ? profile.fullName : profile.businessName || profile.fullName,
    account_type: accountType,
    business_name: profile.businessName || null,
    business_city: profile.city,
    profile_completed: true,
    phone_verified: true,
    mobile_verified: true,
    terms_accepted: true,
    accepted_terms: true,
    staging_demo: true,
  };
}

export function stagingDemoRolePayload(mobile: string) {
  const user = buildStagingDemoUser(mobile);
  const business = user.account_type !== "personal";
  const roleTitles: Record<DemoAccountType, string> = {
    personal: "حساب شخصی",
    dealer: "مدیر نمایشگاه",
    parts_store: "مدیر فروشگاه قطعات",
    repair_shop: "مدیر تعمیرگاه",
    car_service: "مدیر خدمات خودرو",
  };

  return {
    user,
    primary_role: business ? "business_owner" : "user",
    role_title: roleTitles[user.account_type],
    roles: business ? ["user", user.account_type, "business_owner"] : ["user"],
    permissions: business ? ["business:read", "business:manage", "listing:manage"] : ["listing:manage"],
    is_site_owner: false,
    redirect_to: business ? "/account-v2/businesses" : "/account",
    staging_demo: true,
  };
}

export function createStagingDemoToken(mobile: string) {
  const prefix = BigInt(mobile).toString(16).padStart(16, "0");
  const digest = createHash("sha256")
    .update(`chakod-staging-demo:${mobile}`)
    .digest("hex")
    .slice(0, 48);
  return `${prefix}${digest}`;
}

function mobileFromStagingDemoToken(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) return "";
  try {
    const mobile = BigInt(`0x${token.slice(0, 16)}`).toString().padStart(11, "0");
    if (!/^09\d{9}$/.test(mobile)) return "";
    return createStagingDemoToken(mobile) === token.toLowerCase() ? mobile : "";
  } catch {
    return "";
  }
}

export function resolveStagingDemoIdentity(input: {
  hostname: string;
  token: string;
  endpoint: IdentityEndpoint;
}) {
  if (!isStagingDemoEnabled(input.hostname)) return null;
  const mobile = mobileFromStagingDemoToken(input.token);
  if (!mobile) return null;

  if (input.endpoint === "/api/admin-me.php") {
    return {
      success: false,
      logged_in: true,
      is_admin: false,
      staging_demo: true,
    };
  }

  return {
    success: true,
    logged_in: true,
    is_admin: false,
    staging_demo: true,
    user: buildStagingDemoUser(mobile),
  };
}
