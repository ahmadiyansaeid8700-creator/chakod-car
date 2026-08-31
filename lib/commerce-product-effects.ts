import type { commerceOrders } from "../db/schema";
import {
  creditMutationValues,
  STORY_CREDIT_ASSET,
} from "./credit-ledger.ts";

const STORY_PACKS = {
  story_pack_25: 25,
  story_pack_50: 50,
  story_pack_100: 100,
} as const;

export function paidCreditEffect(order: typeof commerceOrders.$inferSelect) {
  const quantity = STORY_PACKS[order.productCode as keyof typeof STORY_PACKS];
  if (!quantity) return null;

  return creditMutationValues({
    ownerKey: order.ownerKey,
    assetCode: STORY_CREDIT_ASSET,
    quantity,
    transactionType: "purchase",
    referenceType: "order",
    referenceId: order.orderNo,
    idempotencyKey: `order:${order.id}:story_credit`,
    metadata: { product_code: order.productCode },
  });
}
