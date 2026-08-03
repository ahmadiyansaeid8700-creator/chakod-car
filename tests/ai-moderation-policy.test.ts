import assert from "node:assert/strict";
import test from "node:test";

import type { ListingModerationInput } from "../lib/ai-moderation/contracts.ts";
import {
  hasBlockingFinding,
  inspectListingRules,
} from "../lib/ai-moderation/policy.ts";

function validListing(
  overrides: Partial<ListingModerationInput> = {},
): ListingModerationInput {
  return {
    listing_id: 42,
    title: "پژو ۲۰۷ اتوماتیک مدل ۱۴۰۳",
    description:
      "خودرو شخصی، بدون تصادف، سرویس‌های دوره‌ای انجام شده و آماده بازدید حضوری است.",
    brand: "پژو",
    model: "۲۰۷",
    production_year: 1403,
    mileage_km: 23_000,
    price_toman: 1_250_000_000,
    image_urls: [
      "https://api.chakod.com/uploads/car-front.jpg",
      "https://api.chakod.com/uploads/car-side.jpg",
    ],
    ...overrides,
  };
}

test("a complete listing has no deterministic risk findings", () => {
  assert.deepEqual(inspectListingRules(validListing()), []);
});

test("advance payment language always requires human review", () => {
  const findings = inspectListingRules(
    validListing({
      description:
        "برای رزرو خودرو قبل از بازدید مبلغ بیعانه کارت به کارت کنید.",
    }),
  );

  assert.equal(hasBlockingFinding(findings), true);
  assert.equal(
    findings.some((finding) => finding.code === "ADVANCE_PAYMENT_REQUEST"),
    true,
  );
});

test("a likely duplicate is blocked from automatic publication", () => {
  const findings = inspectListingRules(
    validListing({ duplicate_similarity: 0.94 }),
  );

  assert.equal(hasBlockingFinding(findings), true);
  assert.equal(
    findings.some((finding) => finding.code === "LIKELY_DUPLICATE"),
    true,
  );
});

test("a listing without images cannot be auto-approved", () => {
  const findings = inspectListingRules(validListing({ image_urls: [] }));

  assert.equal(hasBlockingFinding(findings), true);
  assert.equal(
    findings.some((finding) => finding.code === "NO_IMAGE"),
    true,
  );
});
