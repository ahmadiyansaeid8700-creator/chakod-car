import assert from "node:assert/strict";
import test from "node:test";

import type {
  AdminListingContext,
  PublicListingContext,
} from "../lib/ai-assistant/contracts.ts";
import {
  buildAdminOperationalInsights,
  buildMarketIntelligence,
  enrichAdminQueue,
  parsePublicSearchIntent,
} from "../lib/ai-assistant/intelligence.ts";

test("understands Persian vehicle search constraints", () => {
  const intent = parsePublicSearchIntent(
    "یک پژو ۲۰۷ اتومات بین ۱ تا ۲ میلیارد، مدل ۱۴۰۲ به بالا و زیر ۵۰ هزار کار در رشت می‌خوام",
    {
      path: "/",
      title: "چاکود",
      locationProvince: "گیلان",
      locationCities: ["رشت", "انزلی"],
    },
  );

  assert.equal(intent.brand, "پژو");
  assert.equal(intent.q, "207");
  assert.equal(intent.min_price, 1_000_000_000);
  assert.equal(intent.max_price, 2_000_000_000);
  assert.equal(intent.min_year, 1402);
  assert.equal(intent.max_mileage, 50_000);
  assert.equal(intent.transmission, "automatic");
  assert.equal(intent.province, "گیلان");
  assert.equal(intent.city, "رشت");
});

test("does not force the first selected city when the user did not name it", () => {
  const intent = parsePublicSearchIntent("تا ۲ میلیارد چی بخرم؟", {
    path: "/",
    title: "چاکود",
    locationProvince: "گیلان",
    locationCities: ["رشت", "انزلی"],
  });

  assert.equal(intent.max_price, 2_000_000_000);
  assert.equal(intent.province, "گیلان");
  assert.equal(intent.city, "");
});

test("calculates asking-price intelligence without inventing transaction data", () => {
  const listings = [900, 1_000, 1_100].map(
    (price, index): PublicListingContext => ({
      id: index + 1,
      title: `آگهی ${index + 1}`,
      brand: "پژو",
      model: "۲۰۷",
      year: 1402,
      mileage_km: 30_000,
      price_toman: price,
      location: "گیلان",
      body_status: "",
      transmission: "automatic",
      fuel_type: "gasoline",
      seller_type: "personal",
      views_count: 10,
      href: `/listing/${index + 1}`,
    }),
  );
  const market = buildMarketIntelligence(
    listings,
    { price_toman: 1_300 },
    1_000,
  );

  assert.equal(market.median_price_toman, 1_000);
  assert.equal(market.affordable_count, 2);
  assert.equal(market.current_listing_position, "above_market");
});

test("prioritizes risky and stale admin listings", () => {
  const queue: AdminListingContext[] = [
    adminListing({ id: 1, risk_level: "low", age_days: 0 }),
    adminListing({
      id: 2,
      risk_level: "high",
      risk_score: 90,
      age_days: 5,
    }),
  ];
  const enriched = enrichAdminQueue(queue);
  const insights = buildAdminOperationalInsights(enriched, {});

  assert.equal(enriched[0].id, 2);
  assert.equal(enriched[0].priority_reasons.includes("ریسک بالا"), true);
  assert.equal(insights.critical_total, 1);
  assert.equal(insights.stale_total, 1);
  assert.equal(insights.workload_score > 0, true);
});

function adminListing(
  overrides: Partial<AdminListingContext>,
): AdminListingContext {
  return {
    id: 1,
    title: "آگهی آزمایشی",
    status: "pending",
    moderation_status: "reviewed",
    risk_level: "low",
    risk_score: 10,
    moderation_reason: "بررسی اولیه",
    owner_type: "personal",
    created_at: "2026-07-28 10:00:00",
    age_days: 0,
    href: "/listing/1",
    priority_score: 0,
    priority_reasons: [],
    ...overrides,
  };
}
