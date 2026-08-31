import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { paidCreditEffect } from "../lib/commerce-product-effects.ts";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

function order(productCode, overrides = {}) {
  return {
    id: 42,
    orderNo: "CHK-42",
    idempotencyKey: "order-request-42",
    ownerKey: "owner-key",
    orderType: "service",
    productCode,
    amountToman: 250_000,
    discountToman: 0,
    finalAmountToman: 250_000,
    currency: "IRR",
    status: "paid",
    metadataJson: '{"credit_quantity":999999}',
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
    ...overrides,
  };
}

test("maps only canonical persisted Story pack product codes to credits", () => {
  const expected = [
    ["story_pack_25", 25],
    ["story_pack_50", 50],
    ["story_pack_100", 100],
  ];

  for (const [productCode, quantity] of expected) {
    const effect = paidCreditEffect(order(productCode));
    assert.equal(effect?.ownerKey, "owner-key");
    assert.equal(effect?.assetCode, "story_credit");
    assert.equal(effect?.quantityDelta, quantity);
    assert.equal(effect?.transactionType, "purchase");
    assert.equal(effect?.referenceType, "order");
    assert.equal(effect?.referenceId, "CHK-42");
    assert.equal(effect?.idempotencyKey, "order:42:story_credit");
    assert.deepEqual(JSON.parse(effect?.metadataJson || "{}"), { product_code: productCode });
  }

  assert.equal(paidCreditEffect(order("listing_bump")), null);
  assert.equal(paidCreditEffect(order("story_pack_25", { productCode: "listing_bump" })), null);
});

test("fulfills Story credits inside payment settlement and reconciles paid replays", async () => {
  const verify = await source("app/api/payments/verify/route.ts");

  assert.match(verify, /paidCreditEffect\(order\)/);
  assert.match(verify, /creditLedger/);
  assert.match(verify, /onConflictDoNothing\(\{ target: creditLedger\.idempotencyKey \}\)/);
  assert.match(verify, /reconcilePaidCreditEffect\(db, order\)/);
  assert.match(verify, /order\.status === "paid"[\s\S]*?reconcilePaidCreditEffect\(db, order\)/);

  const batchBlocks = [...verify.matchAll(/await db\.batch\(\[([\s\S]*?)\]\);/g)].map((match) => match[1]);
  assert.ok(
    batchBlocks.some((block) =>
      block.includes("update(commerceOrders)") &&
      block.includes("insert(paymentAttempts)") &&
      block.includes("insert(invoices)") &&
      /\bcreditEffect\b/.test(block),
    ),
    "a paid non-wallet batch must include the idempotent credit effect statement",
  );
});
