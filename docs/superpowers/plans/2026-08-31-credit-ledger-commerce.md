# Credit Ledger and Story Commerce Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a scalable multi-asset credit ledger, non-expiring purchased credits, Story packs, and same-owner Story-credit transfer without mixing credit units with the existing Toman wallet.

**Architecture:** Keep Commerce as the order/payment system and add an auditable credit ledger keyed by finance `ownerKey`/scope and `assetCode`. A balance-cache table provides O(1) reads while immutable ledger rows remain the source of truth; every grant, debit, refund, transfer, and admin adjustment is idempotent and references its originating order or action.

**Tech Stack:** Next 16 / Vinext, TypeScript 5.9, Drizzle ORM 0.45, SQLite/D1, Node `--test` contract tests.

**Spec:** `docs/superpowers/specs/2026-08-30-stories-revenue-credit-design.md`

## Global Constraints

- Purchased listing and Story credit packs have no expiry.
- Free yearly listing quotas keep their yearly reset behavior.
- Story packs are 25=250,000 Toman, 50=450,000 Toman, 100=800,000 Toman initially; values are admin-controlled, not route constants.
- Pack size never affects Story ranking.
- Story credits may transfer only between verified scopes owned by the same user.
- Toman wallet units and credit units must never be stored in the same numeric balance column.
- All mutations are idempotent and auditable.
- No production database, DNS, secrets, or `main` changes in this plan.

---

### Task 1: Add multi-asset credit ledger schema

**Files:**
- Modify: `db/schema.ts`
- Create: `drizzle/0010_credit_ledger.sql`
- Modify: `tests/migration-chain-contract.test.mjs`
- Create: `tests/credit-ledger-contract.test.mjs`

**Interfaces:**
- Produces tables `credit_balances` and `credit_ledger_transactions`.
- Unique balance key: `(owner_key, asset_code)`.
- Unique ledger idempotency key: `(owner_key, asset_code, idempotency_key)`.

- [ ] **Step 1: Write the failing schema contract test**

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync("db/schema.ts", "utf8");
const migration = fs.readFileSync("drizzle/0010_credit_ledger.sql", "utf8");

test("credit ledger has typed balances and idempotent immutable transactions", () => {
  assert.match(schema, /creditBalances/);
  assert.match(schema, /creditLedgerTransactions/);
  assert.match(migration, /CREATE TABLE `credit_balances`/);
  assert.match(migration, /CREATE TABLE `credit_ledger_transactions`/);
  assert.match(migration, /asset_code/);
  assert.match(migration, /idempotency_key/);
});
```

- [ ] **Step 2: Run the focused test and prove RED**

Run: `node --test tests/credit-ledger-contract.test.mjs`
Expected: FAIL because `drizzle/0010_credit_ledger.sql` and schema exports do not exist.

- [ ] **Step 3: Add the Drizzle models and migration**

Use this model shape in `db/schema.ts`:

```ts
export const creditBalances = sqliteTable(
  "credit_balances",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerKey: text("owner_key").notNull(),
    assetCode: text("asset_code").notNull(),
    availableQuantity: integer("available_quantity").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    ownerAssetUnique: uniqueIndex("credit_balances_owner_asset_unique").on(table.ownerKey, table.assetCode),
  }),
);

export const creditLedgerTransactions = sqliteTable(
  "credit_ledger_transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerKey: text("owner_key").notNull(),
    assetCode: text("asset_code").notNull(),
    direction: text("direction").notNull(),
    quantity: integer("quantity").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    transactionType: text("transaction_type").notNull(),
    referenceType: text("reference_type").notNull().default(""),
    referenceId: text("reference_id").notNull().default(""),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull().default("completed"),
    description: text("description").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    ownerAssetIdempotencyUnique: uniqueIndex("credit_ledger_owner_asset_idempotency_unique").on(
      table.ownerKey,
      table.assetCode,
      table.idempotencyKey,
    ),
  }),
);
```

The SQL migration must create matching columns/indexes and must not alter `wallets.available_balance_toman`.

- [ ] **Step 4: Run migration and schema contracts**

Run: `node --test tests/credit-ledger-contract.test.mjs tests/migration-chain-contract.test.mjs && npm run d1:verify`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts drizzle/0010_credit_ledger.sql tests/credit-ledger-contract.test.mjs tests/migration-chain-contract.test.mjs
git commit -m "feat: add multi-asset credit ledger"
```

### Task 2: Implement atomic credit-ledger operations

**Files:**
- Create: `lib/credit-ledger.ts`
- Create: `tests/credit-ledger-behavior.test.mjs`

**Interfaces:**
- Produces `type CreditAssetCode = "story_credit" | "listing_credit"`.
- Produces `getCreditBalance(ownerKey, assetCode): Promise<number>`.
- Produces `grantCredits(input): Promise<{ reused: boolean; balance: number; transactionId: number }>`.
- Produces `consumeCredits(input): Promise<{ reused: boolean; balance: number; transactionId: number }>`.
- Produces `transferCredits(input): Promise<{ reused: boolean; sourceBalance: number; destinationBalance: number }>`.

- [ ] **Step 1: Write failing behavior contracts for idempotency and insufficient balance**

```js
test("credit-ledger implementation exposes grant consume and atomic transfer", () => {
  const source = fs.readFileSync("lib/credit-ledger.ts", "utf8");
  assert.match(source, /export async function grantCredits/);
  assert.match(source, /export async function consumeCredits/);
  assert.match(source, /export async function transferCredits/);
  assert.match(source, /insufficient_credit_balance/);
  assert.match(source, /idempotencyKey/);
});
```

- [ ] **Step 2: Run and prove RED**

Run: `node --test tests/credit-ledger-behavior.test.mjs`
Expected: FAIL because `lib/credit-ledger.ts` does not exist.

- [ ] **Step 3: Implement minimal ledger primitives**

Use a shared input contract:

```ts
type CreditMutationInput = {
  ownerKey: string;
  assetCode: CreditAssetCode;
  quantity: number;
  idempotencyKey: string;
  transactionType: "purchase" | "consume" | "refund" | "admin_adjustment";
  referenceType: string;
  referenceId: string;
  description?: string;
};
```

`grantCredits` must insert/reuse the ledger idempotency row and increment the matching balance exactly once. `consumeCredits` must update with `gte(availableQuantity, quantity)` and return an error object/code `insufficient_credit_balance` without creating a completed debit when the conditional update affects zero rows. `transferCredits` must write one `transfer_out` row and one `transfer_in` row with the same transfer reference and revert the source debit if the destination batch fails, mirroring the existing defensive pattern in `app/api/finance/wallet/transfer/route.ts`.

- [ ] **Step 4: Run focused tests and TypeScript**

Run: `node --test tests/credit-ledger-behavior.test.mjs && npx tsc --noEmit -p tsconfig.launch.json`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/credit-ledger.ts tests/credit-ledger-behavior.test.mjs
git commit -m "feat: add atomic credit ledger operations"
```

### Task 3: Expose credit balances and same-owner credit transfer

**Files:**
- Create: `app/api/finance/credits/route.ts`
- Create: `app/api/finance/credits/transfer/route.ts`
- Modify: `app/account/wallet/WalletClient.tsx`
- Modify: `app/account/wallet/page.module.css`
- Create: `tests/finance-credit-transfer-contract.test.mjs`

**Interfaces:**
- `GET /api/finance/credits` returns `{ success, balances: [{ asset_code, available_quantity }] }` for active scope.
- `POST /api/finance/credits/transfer` consumes `{ source_scope, destination_scope, asset_code, quantity, idempotency_key }`.
- Only `story_credit` is user-transferable in v1.

- [ ] **Step 1: Write failing API/UI contract tests**

Assert the route calls `listOwnedFinanceAccounts`, validates both scopes, rejects membership/non-owned destinations, and invokes `transferCredits`. Assert WalletClient renders Story-credit balance and sends `asset_code: "story_credit"` rather than `amount_toman` for credit transfer.

- [ ] **Step 2: Run and prove RED**

Run: `node --test tests/finance-credit-transfer-contract.test.mjs`
Expected: FAIL because routes/UI support do not exist.

- [ ] **Step 3: Implement routes and Wallet UI**

Use the existing ownership contract from `app/api/finance/wallet/transfer/route.ts`; do not invent a second identity resolver. Keep Toman transfer unchanged. Add a separate Story-credit transfer form so Toman and count-based assets cannot be confused.

- [ ] **Step 4: Run focused contracts, finance contracts, and TypeScript**

Run: `node --test tests/finance-credit-transfer-contract.test.mjs tests/finance-commerce-contract.test.mjs && npx tsc --noEmit -p tsconfig.launch.json`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/finance/credits app/account/wallet tests/finance-credit-transfer-contract.test.mjs
git commit -m "feat: transfer story credits between owned accounts"
```

### Task 4: Add admin-controlled Story pack rules

**Files:**
- Modify: `app/admin/rules/page.tsx`
- Modify: `app/api/admin/commerce/route.ts`
- Modify: `tests/finance-commerce-contract.test.mjs`
- Create: `tests/story-pack-rules-contract.test.mjs`

**Interfaces:**
- `platform_rules.story_pack_25_count = 25`, `story_pack_25_price = 250000`.
- `platform_rules.story_pack_50_count = 50`, `story_pack_50_price = 450000`.
- `platform_rules.story_pack_100_count = 100`, `story_pack_100_price = 800000`.
- `platform_rules.story_duration_hours = 24`.
- `platform_rules.story_sales_enabled = true`.

- [ ] **Step 1: Write failing rules contract**

Test exact keys/defaults and verify the admin page has a Story section with count, total-price, duration, and enabled controls.

- [ ] **Step 2: Run and prove RED**

Run: `node --test tests/story-pack-rules-contract.test.mjs`
Expected: FAIL because Story pack controls are absent.

- [ ] **Step 3: Add Story defaults and inputs to the existing `platform_rules` persistence path**

Do not add Story price constants to `/api/stories/*`. Calculate unit price in UI as `Math.floor(totalPrice / count)` so count and total price are the source fields and cannot drift from a separate stored unit-price value.

- [ ] **Step 4: Run rules/Commerce contracts and TypeScript**

Run: `node --test tests/story-pack-rules-contract.test.mjs tests/finance-commerce-contract.test.mjs && npx tsc --noEmit -p tsconfig.launch.json`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/admin/rules/page.tsx app/api/admin/commerce/route.ts tests/story-pack-rules-contract.test.mjs tests/finance-commerce-contract.test.mjs
git commit -m "feat: manage story credit packs in admin rules"
```

### Task 5: Fulfill paid Story-pack orders exactly once

**Files:**
- Create: `lib/story-pack-commerce.ts`
- Create: `app/api/stories/packages/route.ts`
- Create: `app/api/stories/packages/checkout/route.ts`
- Modify: payment-success fulfillment path used by `app/api/finance/order/*` after inspection during execution
- Create: `tests/story-pack-commerce-contract.test.mjs`

**Interfaces:**
- Product codes: `story_pack_25`, `story_pack_50`, `story_pack_100`.
- Produces `fulfillStoryPackOrder(orderId: number): Promise<{ reused: boolean; creditsGranted: number }>`.
- Fulfillment uses ledger idempotency key `story_pack_order_<orderId>`.

- [ ] **Step 1: Write failing fulfillment contract**

Test that only `status === "paid"` orders with known Story-pack product codes can grant credits and that the grant idempotency key is order-derived.

- [ ] **Step 2: Run and prove RED**

Run: `node --test tests/story-pack-commerce-contract.test.mjs`
Expected: FAIL because fulfillment module/routes do not exist.

- [ ] **Step 3: Implement pack catalog and fulfillment**

`GET /api/stories/packages` reads current `platform_rules`; checkout creates a normal Commerce order using the active scope. After the existing payment path marks the order paid, call `fulfillStoryPackOrder` once; retries must return `reused: true` through `grantCredits` rather than add credits twice.

- [ ] **Step 4: Run Story-pack/finance contracts and TypeScript**

Run: `node --test tests/story-pack-commerce-contract.test.mjs tests/finance-commerce-contract.test.mjs && npx tsc --noEmit -p tsconfig.launch.json`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/story-pack-commerce.ts app/api/stories/packages tests/story-pack-commerce-contract.test.mjs
git commit -m "feat: sell and fulfill story credit packs"
```

### Task 6: Remove purchased-credit expiry semantics from listing-pack policy

**Files:**
- Modify: `docs/revenue-model-fa.md`
- Modify: listing-credit/package implementation files found by the existing `finance-commerce-contract` test during execution
- Modify: `tests/finance-commerce-contract.test.mjs`
- Create: `tests/nonexpiring-credit-pack-contract.test.mjs`

**Interfaces:**
- Purchased credit rows/entitlements have no business expiry.
- Free yearly quota reset remains unchanged.

- [ ] **Step 1: Add a failing regression test**

Assert the canonical revenue doc no longer says purchased credits expire after 365 days, and assert purchased-pack code does not reject a credit based on a package expiry timestamp while free-quota reset logic still exists.

- [ ] **Step 2: Run and prove RED**

Run: `node --test tests/nonexpiring-credit-pack-contract.test.mjs`
Expected: FAIL against current 365-day wording/logic.

- [ ] **Step 3: Remove purchased-credit expiry checks and update copy**

Do not remove annual reset fields used exclusively by free quota. Do not change the 12-month business-presence subscription; it is not a credit pack.

- [ ] **Step 4: Run all finance contracts and launch typecheck**

Run: `node --test tests/nonexpiring-credit-pack-contract.test.mjs tests/finance-commerce-contract.test.mjs && npm run check:launch`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/revenue-model-fa.md tests/nonexpiring-credit-pack-contract.test.mjs tests/finance-commerce-contract.test.mjs
git commit -m "fix: make purchased credit packs non-expiring"
```

## Plan Verification Gate

Run: `npm run test:contracts && npm run d1:verify && npx tsc --noEmit -p tsconfig.launch.json`
Expected: all PASS before this subsystem is merged into the staging integration branch.
