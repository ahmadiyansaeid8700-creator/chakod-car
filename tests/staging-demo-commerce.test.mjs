import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStagingDemoCommerce,
  isStagingDemoOrderMetadata,
  quoteStagingDemoService,
} from "../lib/staging-demo-commerce.ts";
import { createStagingDemoToken } from "../lib/staging-demo-session.ts";

test("serves a canonical Commerce catalog only to a valid staging demo session", () => {
  const token = createStagingDemoToken("09000000000");
  const payload = buildStagingDemoCommerce({
    hostname: "staging.chakod.com",
    token,
  });

  assert.equal(payload?.success, true);
  assert.equal(payload?.staging_demo, true);
  assert.equal(payload?.payment_gateway_ready, true);
  assert.ok(payload?.services.some((service) => service.service_key === "listing_bump"));
  assert.ok(payload?.listings.length);
  assert.ok(payload?.listings.every((listing) => listing.listing_owner_type === "personal"));
  assert.deepEqual(payload?.dealers, []);

  assert.equal(
    buildStagingDemoCommerce({ hostname: "chakod.com", token }),
    null,
  );
});

test("offers exactly the approved no-expiry Story credit packs", () => {
  const token = createStagingDemoToken("09000000000");
  const payload = buildStagingDemoCommerce({ hostname: "staging.chakod.com", token });
  const storyServices = (payload?.services || []).filter((service) => service.service_key.startsWith("story_"));

  assert.deepEqual(
    storyServices.map((service) => [
      service.service_key,
      service.amount_toman,
      service.settings.credit_quantity,
    ]),
    [
      ["story_pack_25", 250_000, 25],
      ["story_pack_50", 450_000, 50],
      ["story_pack_100", 800_000, 100],
    ],
  );
  for (const service of storyServices) {
    assert.equal(service.audience, "all");
    assert.equal(service.duration_value, 0);
    assert.equal(service.duration_unit, "none");
    assert.equal(service.settings.asset_code, "story_credit");
    assert.equal(service.settings.no_expiry, true);
  }
  assert.equal(payload?.services.some((service) => service.service_key === "listing_story"), false);
  assert.ok(payload?.provinces.every((province) => !("story_price_toman" in province)));
});

test("gives business demo accounts only their fixture business and listings", () => {
  const token = createStagingDemoToken("09000000001");
  const payload = buildStagingDemoCommerce({
    hostname: "staging.chakod.com",
    token,
  });

  assert.equal(payload?.user.account_type, "dealer");
  assert.equal(payload?.dealers.length, 1);
  assert.ok(payload?.listings.length);
  assert.ok(payload?.listings.every((listing) => listing.listing_owner_type === "dealer"));
});

test("quotes demo products from the server catalog and accepts only the test discount", () => {
  const regular = quoteStagingDemoService("listing_bump", "");
  const discounted = quoteStagingDemoService("listing_bump", "TEST10");

  assert.equal(regular?.amountToman, 65_000);
  assert.equal(regular?.finalAmountToman, 65_000);
  assert.equal(discounted?.discountToman, 6_500);
  assert.equal(discounted?.finalAmountToman, 58_500);
  assert.equal(quoteStagingDemoService("unknown_product", "TEST10"), null);
});

test("recognizes only explicit staging demo order metadata", () => {
  assert.equal(isStagingDemoOrderMetadata('{"staging_demo":true}'), true);
  assert.equal(isStagingDemoOrderMetadata('{"staging_demo":false}'), false);
  assert.equal(isStagingDemoOrderMetadata("{}"), false);
  assert.equal(isStagingDemoOrderMetadata("invalid"), false);
});
