import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("creates paid products from canonical Commerce pricing instead of browser amount", async () => {
  const orders = await source("app/api/finance/orders/route.ts");
  assert.match(orders, /action:\s*"create_order"/);
  assert.match(orders, /service_key:\s*input\.serviceKey/);
  assert.match(orders, /order\.amount_toman\s*\|\|\s*order\.total_amount_toman/);
  assert.match(orders, /finalAmountToman:\s*commerceResult\.amountToman/);
  assert.match(orders, /verifyManagedListing/);
  assert.match(orders, /verifyManagedBusiness/);
});

test("keeps wallet charge as the only direct user amount flow and bounds it", async () => {
  const orders = await source("app/api/finance/orders/route.ts");
  assert.match(orders, /orderType === "wallet_charge"/);
  assert.match(orders, /amountToman < 10_000/);
  assert.match(orders, /amountToman > 500_000_000/);
});

test("creates gateway payment from the persisted owner order", async () => {
  const payment = await source("app/api/payments/create/route.ts");
  assert.match(payment, /eq\(commerceOrders\.orderNo, orderNo\)/);
  assert.match(payment, /eq\(commerceOrders\.ownerKey, ownerKey\)/);
  assert.match(payment, /amount_toman:\s*order\.finalAmountToman/);
  assert.match(payment, /order\.status === "paid"/);
  assert.match(payment, /order\.status !== "pending_payment"/);
  assert.match(payment, /callbackPath\.startsWith\("\/account\/payments\/"\)/);
});

test("verifies gateway callback against owner, order number and idempotency key", async () => {
  const verify = await source("app/api/payments/verify/route.ts");
  assert.match(verify, /eq\(commerceOrders\.orderNo, orderNo\)/);
  assert.match(verify, /eq\(commerceOrders\.ownerKey, ownerKey\)/);
  assert.match(verify, /eq\(commerceOrders\.idempotencyKey, idempotencyKey\)/);
  assert.match(verify, /\/api\/payments\/verify\.php/);
  assert.match(verify, /amount_toman:\s*order\.finalAmountToman/);
  assert.match(verify, /db\.insert\(invoices\)/);
});

test("keeps finance mutations protected from cross-site requests", async () => {
  const paths = [
    "app/api/finance/orders/route.ts",
    "app/api/payments/create/route.ts",
    "app/api/payments/verify/route.ts",
  ];
  for (const path of paths) {
    const text = await source(path);
    assert.match(text, /rejectCrossSiteMutation/);
  }
});

test("keeps simulated checkout bound to an explicit staging demo session and marked D1 orders", async () => {
  const catalog = await source("app/api/auth/commerce/route.ts");
  const orders = await source("app/api/finance/orders/route.ts");
  const create = await source("app/api/payments/create/route.ts");
  const verify = await source("app/api/payments/verify/route.ts");
  const checkout = await source("app/account/payments/checkout/CheckoutClient.tsx");

  assert.match(catalog, /buildStagingDemoCommerce/);
  assert.match(orders, /createPublicReference\("TEST-CHK"\)/);
  assert.match(orders, /staging_demo:\s*Boolean\(stagingDemo\)/);
  assert.match(create, /isStagingDemoOrderMetadata\(order\.metadataJson\)/);
  assert.match(create, /callbackUrl\.searchParams\.set\("authority", `TEST-/);
  assert.match(verify, /gateway:\s*"staging-demo"/);
  assert.match(verify, /هیچ پول واقعی جابه‌جا نشده است/);
  assert.match(checkout, /محیط آزمایشی است/);
});
