import assert from "node:assert/strict";
import test from "node:test";

import {
  STORY_CREDIT_ASSET,
  creditMutationValues,
  creditTransferValues,
  isInsufficientCreditError,
} from "../lib/credit-ledger.ts";

test("builds signed ledger values from positive safe quantities", () => {
  assert.equal(STORY_CREDIT_ASSET, "story_credit");

  const purchase = creditMutationValues({
    ownerKey: "user:42",
    assetCode: STORY_CREDIT_ASSET,
    quantity: 25,
    transactionType: "purchase",
    referenceType: "order",
    referenceId: "CHK-25",
    idempotencyKey: "order:25:story_credit",
    metadata: { product_code: "story_pack_25" },
  });
  assert.equal(purchase.quantityDelta, 25);
  assert.equal(purchase.metadataJson, JSON.stringify({ product_code: "story_pack_25" }));
  assert.equal("createdAt" in purchase, false);
  assert.equal("expiresAt" in purchase, false);
  assert.equal("expires_at" in purchase, false);

  for (const transactionType of ["refund", "transfer_in", "admin_adjustment"]) {
    assert.equal(
      creditMutationValues({
        ownerKey: "user:42",
        assetCode: STORY_CREDIT_ASSET,
        quantity: 2,
        transactionType,
        referenceType: "test",
        referenceId: transactionType,
        idempotencyKey: `test:${transactionType}`,
      }).quantityDelta,
      2,
    );
  }

  for (const transactionType of ["consume", "transfer_out"]) {
    assert.equal(
      creditMutationValues({
        ownerKey: "user:42",
        assetCode: STORY_CREDIT_ASSET,
        quantity: 2,
        transactionType,
        referenceType: "test",
        referenceId: transactionType,
        idempotencyKey: `test:${transactionType}`,
      }).quantityDelta,
      -2,
    );
  }
});

test("rejects unsafe quantities and malformed asset codes", () => {
  const base = {
    ownerKey: "user:42",
    assetCode: STORY_CREDIT_ASSET,
    transactionType: "purchase",
    referenceType: "order",
    referenceId: "CHK-1",
    idempotencyKey: "order:1:story_credit",
  };

  for (const quantity of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => creditMutationValues({ ...base, quantity }), /quantity/i);
  }

  for (const assetCode of ["Story_Credit", "story credit", "story/credit", "_"]) {
    assert.throws(() => creditMutationValues({ ...base, quantity: 1, assetCode }), /asset/i);
  }
});

test("creates reciprocal atomic transfer rows from one idempotency base", () => {
  const [outgoing, incoming] = creditTransferValues({
    sourceOwnerKey: "activity:12",
    destinationOwnerKey: "personal:42",
    assetCode: STORY_CREDIT_ASSET,
    quantity: 5,
    idempotencyKey: "credit_transfer_abc",
    referenceType: "credit_transfer",
    referenceId: "abc",
  });

  assert.equal(outgoing.quantityDelta, -5);
  assert.equal(incoming.quantityDelta, 5);
  assert.equal(outgoing.transactionType, "transfer_out");
  assert.equal(incoming.transactionType, "transfer_in");
  assert.equal(outgoing.idempotencyKey, "credit_transfer_abc:out");
  assert.equal(incoming.idempotencyKey, "credit_transfer_abc:in");
  assert.equal(outgoing.counterpartyOwnerKey, "personal:42");
  assert.equal(incoming.counterpartyOwnerKey, "activity:12");
});

test("recognizes the D1 insufficient-credit trigger error only", () => {
  assert.equal(isInsufficientCreditError(new Error("D1_ERROR: insufficient_credit")), true);
  assert.equal(isInsufficientCreditError({ message: "insufficient_credit" }), true);
  assert.equal(isInsufficientCreditError(new Error("UNIQUE constraint failed")), false);
  assert.equal(isInsufficientCreditError(null), false);
});
