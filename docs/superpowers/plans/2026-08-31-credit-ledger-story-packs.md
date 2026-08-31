# Credit Ledger and Story Packs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a scalable, auditable typed-credit ledger to the existing scoped wallet model and sell the approved 25/50/100 Story credit packs without expiry, while keeping Toman wallet balances separate.

**Architecture:** Commerce remains the sales/order boundary. A new append-only `credit_ledger` is the source of truth for non-cash assets and a trigger-maintained `credit_balances` table is the fast balance cache. The initial asset is `story_credit`; the schema is deliberately generic so listing credits can migrate later without another wallet subsystem. Paid Story-pack orders grant credits exactly once. Transfers reuse the existing finance `scope` ownership model and are atomic between scopes owned by the same user.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, Cloudflare D1/SQLite, Vinext/Vite, Node test runner contract tests.

**Spec:** `docs/superpowers/specs/2026-08-30-stories-revenue-credit-design.md`

## Global Constraints

- Work from a fresh feature branch created from the exact current SHA of `agent/launch-3-local-baseline`; never branch from `main` or infer the SHA.
- Before editing Next.js route code, read the installed Next 16 guide under `node_modules/next/dist/docs/` relevant to Route Handlers.
- Use TDD for every behavior: add the failing contract/unit test, run it and observe RED, implement the minimum code, rerun to GREEN, then commit.
- Do not change Production, `chakod.com`, Production DNS/database, or Production secrets. Staging fixtures remain staging-only.
- Money and credits are different assets. Never store Story credit quantities in `wallets.available_balance_toman` or `wallet_transactions.amount_toman`.
- Purchased Story credits never expire. Do not add `expires_at` to Story credit balances or ledger rows.
- Transfer is allowed only between verified finance scopes returned by `listOwnedFinanceAccounts()` for the same authenticated user. Membership/staff scopes are not destinations.
- Do not introduce a general-purpose cash-to-credit conversion. Credits are granted only by canonical paid products, refunds/reversals, transfers, or audited admin adjustments.
- Additive D1 migrations only. Never rewrite or delete an applied migration.
- Update `package.json` so every newly created contract test runs inside `npm run test:contracts`.

---

## Task 1: Repair migration-chain coverage before adding finance tables

**Files:**
- Modify: `tests/migration-chain-contract.test.mjs`
- Verify: `drizzle/0000_curvy_wildside.sql` through `drizzle/0009_market_floor.sql`
- Verify: `drizzle/meta/_journal.json`

- [ ] **Step 1: Write a failing migration-chain test that reflects the real current repository**

Replace the stale expectation that the chain ends at `0004` with a filesystem-based assertion that all numeric migration files are strictly ordered, unique, and include the current `0009_market_floor` tail before a new migration is added.

```js
import { readdir } from "node:fs/promises";

const migrationFiles = (await readdir(new URL("../drizzle/", import.meta.url)))
  .filter((name) => /^\d{4}_.+\.sql$/.test(name))
  .sort();

assert.equal(migrationFiles.at(-1), "0009_market_floor.sql");
assert.equal(new Set(migrationFiles).size, migrationFiles.length);
assert.deepEqual(
  migrationFiles.map((name) => Number(name.slice(0, 4))),
  migrationFiles.map((_, index) => index),
);
```

- [ ] **Step 2: Run the focused test and prove RED against the stale test assumptions**

Run:

```bash
node --test tests/migration-chain-contract.test.mjs
```

Expected: the old hard-coded journal/snapshot expectation fails or the new current-tail assertion exposes the mismatch that must be corrected in the test contract.

- [ ] **Step 3: Make the migration contract authoritative without rewriting old migrations**

Keep table-presence checks for historical migrations, but make ordering assertions operate on the actual SQL migration files. If `_journal.json` is intentionally not the deployment source for migrations after `0004`, do not fabricate journal entries; document that the repository's `scripts/verify-d1-migrations.mjs` + numbered SQL files are the deployment chain.

- [ ] **Step 4: Run the focused migration test to GREEN**

```bash
node --test tests/migration-chain-contract.test.mjs
```

- [ ] **Step 5: Commit the migration-contract repair**

```bash
git add tests/migration-chain-contract.test.mjs
git commit -m "test: align migration contract with current chain"
```

---

## Task 2: Add generic typed-credit ledger tables with atomic balance enforcement

**Files:**
- Create: `drizzle/0010_credit_ledger.sql`
- Modify: `db/schema.ts`
- Modify: `tests/migration-chain-contract.test.mjs`
- Create: `tests/credit-ledger-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add failing schema/migration tests**

Create `tests/credit-ledger-contract.test.mjs` asserting the new migration and Drizzle schema contain the two tables, a unique `(owner_key, asset_code)` balance key, a unique ledger idempotency key, and SQLite triggers that reject negative balances and update the cache.

```js
assert.match(migration, /CREATE TABLE `credit_balances`/);
assert.match(migration, /CREATE UNIQUE INDEX `credit_balances_owner_asset_unique`/);
assert.match(migration, /CREATE TABLE `credit_ledger`/);
assert.match(migration, /idempotency_key.*UNIQUE/);
assert.match(migration, /RAISE\(ABORT, 'insufficient_credit'\)/);
assert.match(migration, /AFTER INSERT ON credit_ledger/);
assert.match(schema, /export const creditBalances/);
assert.match(schema, /export const creditLedger/);
```

Update the migration-chain test to expect `0010_credit_ledger.sql` as the new tail.

- [ ] **Step 2: Run RED**

```bash
node --test tests/migration-chain-contract.test.mjs tests/credit-ledger-contract.test.mjs
```

Expected: missing migration/schema assertions fail.

- [ ] **Step 3: Create `drizzle/0010_credit_ledger.sql`**

Use this contract (index names may be adjusted only to match repository naming conventions):

```sql
CREATE TABLE `credit_balances` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `owner_key` text NOT NULL,
  `asset_code` text NOT NULL,
  `available_quantity` integer DEFAULT 0 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `credit_balances_owner_asset_unique`
  ON `credit_balances` (`owner_key`, `asset_code`);

CREATE TABLE `credit_ledger` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `owner_key` text NOT NULL,
  `asset_code` text NOT NULL,
  `quantity_delta` integer NOT NULL,
  `transaction_type` text NOT NULL,
  `reference_type` text DEFAULT '' NOT NULL,
  `reference_id` text DEFAULT '' NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `counterparty_owner_key` text,
  `metadata_json` text DEFAULT '{}' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CHECK (`quantity_delta` <> 0)
);
CREATE INDEX `credit_ledger_owner_asset_idx`
  ON `credit_ledger` (`owner_key`, `asset_code`, `id`);

CREATE TRIGGER `credit_ledger_prevent_negative`
BEFORE INSERT ON `credit_ledger`
WHEN NEW.quantity_delta < 0
BEGIN
  SELECT CASE
    WHEN COALESCE((
      SELECT available_quantity
      FROM credit_balances
      WHERE owner_key = NEW.owner_key AND asset_code = NEW.asset_code
    ), 0) + NEW.quantity_delta < 0
    THEN RAISE(ABORT, 'insufficient_credit')
  END;
END;

CREATE TRIGGER `credit_ledger_apply_balance`
AFTER INSERT ON `credit_ledger`
BEGIN
  INSERT INTO credit_balances (
    owner_key, asset_code, available_quantity, updated_at
  ) VALUES (
    NEW.owner_key, NEW.asset_code, NEW.quantity_delta, CURRENT_TIMESTAMP
  )
  ON CONFLICT(owner_key, asset_code) DO UPDATE SET
    available_quantity = credit_balances.available_quantity + NEW.quantity_delta,
    updated_at = CURRENT_TIMESTAMP;
END;
```

- [ ] **Step 4: Add matching Drizzle tables to `db/schema.ts`**

Expose `creditBalances` and `creditLedger` with the exact column names/types above. Use `uniqueIndex` on `(ownerKey, assetCode)` and a normal index if supported by the repository's current Drizzle imports.

- [ ] **Step 5: Add the new test to `test:contracts`**

Append `tests/credit-ledger-contract.test.mjs` to the explicit `test:contracts` command in `package.json`.

- [ ] **Step 6: Run focused tests and D1 verification**

```bash
node --test tests/migration-chain-contract.test.mjs tests/credit-ledger-contract.test.mjs
npm run d1:verify
```

Expected: both tests pass; D1 verifier reports 11 numbered migrations and creates the new tables/triggers in its disposable database.

- [ ] **Step 7: Commit**

```bash
git add drizzle/0010_credit_ledger.sql db/schema.ts tests/migration-chain-contract.test.mjs tests/credit-ledger-contract.test.mjs package.json
git commit -m "feat: add typed credit ledger"
```

---

## Task 3: Implement a single credit-ledger service boundary

**Files:**
- Create: `lib/credit-ledger.ts`
- Create: `tests/credit-ledger-service.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing service-contract tests**

Test for these exported contracts:

```ts
export const STORY_CREDIT_ASSET = "story_credit";
export function creditMutationValues(input: CreditMutationInput): CreditLedgerInsert;
export function creditTransferValues(input: CreditTransferInput): [CreditLedgerInsert, CreditLedgerInsert];
export function isInsufficientCreditError(error: unknown): boolean;
```

Assert:
- quantity is a positive safe integer before direction is applied;
- an invalid/unknown `assetCode` is rejected by a conservative pattern;
- purchase/grant/refund are positive; consume/transfer_out are negative;
- transfer creates matching negative/positive rows with `:out` and `:in` idempotency suffixes and reciprocal counterparties;
- no timestamp/expiry field is generated.

- [ ] **Step 2: Run RED**

```bash
node --test tests/credit-ledger-service.test.mjs
```

- [ ] **Step 3: Implement `lib/credit-ledger.ts` as a pure validation/value-construction layer**

Core types:

```ts
export type CreditTransactionType =
  | "purchase"
  | "consume"
  | "transfer_out"
  | "transfer_in"
  | "refund"
  | "admin_adjustment";

export type CreditMutationInput = {
  ownerKey: string;
  assetCode: string;
  quantity: number;
  transactionType: CreditTransactionType;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  counterpartyOwnerKey?: string | null;
  metadata?: Record<string, unknown>;
};
```

The service must not update `credit_balances` directly. It inserts ledger rows only; D1 triggers own balance mutation.

- [ ] **Step 4: Add test to `test:contracts`, run GREEN, commit**

```bash
node --test tests/credit-ledger-service.test.mjs tests/credit-ledger-contract.test.mjs

git add lib/credit-ledger.ts tests/credit-ledger-service.test.mjs package.json
git commit -m "feat: add credit ledger service boundary"
```

---

## Task 4: Expose Story-credit balances and atomic same-owner transfers

**Files:**
- Create: `app/api/finance/credits/route.ts`
- Create: `app/api/finance/credits/transfer/route.ts`
- Modify: `app/api/finance/summary/route.ts`
- Modify: `app/account/wallet/WalletClient.tsx`
- Modify: `app/account/wallet/page.module.css`
- Create: `tests/finance-credit-transfer-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add failing API/UI contracts**

Assert that the transfer route:
- calls `rejectCrossSiteMutation`;
- obtains accounts from `listOwnedFinanceAccounts(request)`;
- resolves both `source_scope` and `destination_scope` only from that owned list;
- rejects same source/destination and non-positive quantity;
- calls `db.batch()` with exactly two `creditLedger` inserts generated from the same transfer idempotency base;
- maps `insufficient_credit` to HTTP 409;
- never mutates `wallets.availableBalanceToman`.

Assert Wallet UI has a separate “اعتبار استوری” quantity section and a quantity-based transfer form, while the existing Toman transfer remains unchanged.

- [ ] **Step 2: Run RED**

```bash
node --test tests/finance-credit-transfer-contract.test.mjs
```

- [ ] **Step 3: Implement GET balance/read model**

`app/api/finance/credits/route.ts` should resolve the active finance owner key and return typed balances such as:

```json
{
  "success": true,
  "balances": [
    { "asset_code": "story_credit", "available_quantity": 50 }
  ]
}
```

An absent balance row is `0`, not an error.

- [ ] **Step 4: Implement POST transfer atomically**

Request body:

```json
{
  "source_scope": "activity:12",
  "destination_scope": "personal",
  "asset_code": "story_credit",
  "quantity": 5,
  "idempotency_key": "credit_transfer_<uuid>"
}
```

Use the `ownerKey` values already returned by `listOwnedFinanceAccounts()`. Build two rows via `creditTransferValues()` and execute both inserts in one `db.batch()`; the debit trigger prevents overdraw and D1 batch rollback prevents one-sided transfer.

- [ ] **Step 5: Extend finance summary and Wallet UI**

Add a `credit_balances` field to `/api/finance/summary`, and render Story credits as count (`اعتبار`) rather than Toman. Keep cash transactions and credit ledger history visually separated so users cannot confuse currency with units.

- [ ] **Step 6: Run GREEN and TypeScript**

```bash
node --test tests/finance-credit-transfer-contract.test.mjs tests/finance-commerce-contract.test.mjs
npm run check:launch
```

- [ ] **Step 7: Commit**

```bash
git add app/api/finance/credits app/api/finance/summary/route.ts app/account/wallet/WalletClient.tsx app/account/wallet/page.module.css tests/finance-credit-transfer-contract.test.mjs package.json
git commit -m "feat: expose and transfer story credits"
```

---

## Task 5: Replace single-Story sale products with canonical Story packs in staging Commerce

**Files:**
- Modify: `lib/staging-demo-commerce.ts`
- Modify: `tests/staging-demo-commerce.test.mjs`
- Modify: `tests/finance-commerce-contract.test.mjs`
- Modify: `app/account/services/CommerceCenter.tsx`
- Modify: `app/account/payments/checkout/CheckoutClient.tsx` only if product labels/metadata need rendering support

- [ ] **Step 1: Write RED tests for the approved catalog**

Assert staging Commerce exposes exactly these Story pack service keys and prices:

```js
[
  ["story_pack_25", 250_000, 25],
  ["story_pack_50", 450_000, 50],
  ["story_pack_100", 800_000, 100],
]
```

Each service should set `settings.asset_code = "story_credit"` and `settings.credit_quantity` to 25/50/100. Assert the old `listing_story` one-off service is absent.

- [ ] **Step 2: Run RED**

```bash
node --test tests/staging-demo-commerce.test.mjs tests/finance-commerce-contract.test.mjs
```

- [ ] **Step 3: Update `STAGING_DEMO_SERVICES`**

Use server-side canonical demo products:

```ts
{
  service_key: "story_pack_25",
  title: "پکیج ۲۵ استوری",
  audience: "all",
  amount_toman: 250_000,
  duration_value: 0,
  duration_unit: "none",
  is_active: true,
  settings: { staging_demo: true, asset_code: "story_credit", credit_quantity: 25, no_expiry: true },
}
```

Repeat for 50/100. Remove demo province-level Story pricing because Story is no longer a one-off provincial purchase.

- [ ] **Step 4: Surface packs in Commerce Center without a one-off Story card**

Render all three packs for eligible account types; the description must say purchased credits do not expire and larger packs only reduce unit cost. Do not add ranking/boost language.

- [ ] **Step 5: Run GREEN**

```bash
node --test tests/staging-demo-commerce.test.mjs tests/finance-commerce-contract.test.mjs
npm run check:launch
```

- [ ] **Step 6: Commit**

```bash
git add lib/staging-demo-commerce.ts tests/staging-demo-commerce.test.mjs tests/finance-commerce-contract.test.mjs app/account/services/CommerceCenter.tsx app/account/payments/checkout/CheckoutClient.tsx
git commit -m "feat: offer story credit packs"
```

---

## Task 6: Grant paid Story-pack credits exactly once at payment settlement

**Files:**
- Create: `lib/commerce-product-effects.ts`
- Modify: `app/api/payments/verify/route.ts`
- Create: `tests/commerce-credit-fulfillment-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write RED tests for idempotent fulfillment**

Assert product effect mapping is server-owned:

```ts
const STORY_PACKS = {
  story_pack_25: 25,
  story_pack_50: 50,
  story_pack_100: 100,
} as const;
```

Assert payment verification constructs a `purchase` ledger row whose idempotency key is derived only from the persisted order, e.g. `order:${order.id}:story_credit`, and includes that insert in the same D1 batch that marks the order paid and records the invoice/payment attempt.

Also assert the already-paid replay path calls a reconciliation helper that safely ensures the same unique ledger entry exists, rather than granting another 25/50/100.

- [ ] **Step 2: Run RED**

```bash
node --test tests/commerce-credit-fulfillment-contract.test.mjs
```

- [ ] **Step 3: Implement product-effect mapping**

`lib/commerce-product-effects.ts` should expose a pure function returning either `null` or a `creditLedger` insert value for a persisted order. The function must ignore browser metadata for quantity and use `order.productCode` only.

```ts
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
```

- [ ] **Step 4: Add the effect to both staging-demo and real verify batches**

Build the batch array conditionally. For non-credit products behavior must stay byte-for-byte equivalent in result semantics. For Story packs, include `db.insert(creditLedger).values(effect).onConflictDoNothing({ target: creditLedger.idempotencyKey })` in the paid batch.

On `order.status === "paid"`, run the same idempotent insert before returning “already paid”; this repairs a previously paid order if a prior response was interrupted after payment state persisted.

- [ ] **Step 5: Run GREEN and all finance contracts**

```bash
node --test tests/commerce-credit-fulfillment-contract.test.mjs tests/finance-credit-transfer-contract.test.mjs tests/finance-commerce-contract.test.mjs
npm run check:launch
```

- [ ] **Step 6: Commit**

```bash
git add lib/commerce-product-effects.ts app/api/payments/verify/route.ts tests/commerce-credit-fulfillment-contract.test.mjs package.json
git commit -m "feat: fulfill paid story packs as credits"
```

---

## Task 7: Remove expiry language from purchased listing-credit package surfaces

**Files:**
- Modify: `app/admin/rules/page.tsx` (copy only; full rule cleanup is Plan 4)
- Modify: user-facing package copy discovered by `rg "اعتبار یک‌ساله|365|۳۶۵|انقضا" app lib tests docs`
- Modify/Create: the nearest contract tests for every changed UI surface

- [ ] **Step 1: Add RED assertions that purchased listing package copy no longer says annual/365-day**

At minimum the admin package hints currently containing `اعتبار یک‌ساله` must fail the new contract.

- [ ] **Step 2: Run the focused contract and observe RED**

- [ ] **Step 3: Change copy only, not free-quota behavior**

Use wording equivalent to `اعتبار بدون تاریخ انقضا` for purchased 25/50/100 listing packs. Keep `personal_free_listings_yearly` and `dealer_free_listings_yearly` explicitly annual.

- [ ] **Step 4: Run GREEN and commit**

```bash
npm run check:launch
git add app tests
git commit -m "fix: remove expiry claims from purchased credits"
```

---

## Task 8: Full verification and staging-only PR

**Files:**
- Modify at end of implementation session: `AI_HANDOFF.md`

- [ ] **Step 1: Run repository verification**

```bash
npm run check:launch
npm run d1:verify
npm run build:cloudflare
npm run build:cpanel
```

Expected: TypeScript, all explicit contract tests, D1 migration verification, and both build targets pass.

- [ ] **Step 2: Update `AI_HANDOFF.md` with actual evidence**

Record the exact tests run, feature branch, PR state, deployment state, open issues, and next action. Do not claim staging deployment until the workflow has actually completed.

- [ ] **Step 3: Create PR targeting staging**

Base: `agent/launch-3-local-baseline`.

PR scope: typed credit ledger + Story credit packs only. Do not mix Story runtime, business portfolio/catalog, or Market Floor billing into this PR.

- [ ] **Step 4: After explicit owner approval to merge, merge and verify staging**

Wait for `Launch 3 checks` and `Deploy staging Worker`. Verify Story-pack catalog, a simulated staging payment, exactly-once credit grant, same-user scope transfer, and Toman wallet unchanged. Production remains untouched.
