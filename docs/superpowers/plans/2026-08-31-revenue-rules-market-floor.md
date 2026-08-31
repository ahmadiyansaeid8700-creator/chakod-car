# Revenue Rules and Market Floor Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the approved revenue rules canonical and admin-controlled, remove obsolete Showcase/Card-Day semantics, and convert Market Floor from free “cards” to an independent paid Commerce entry whose price is always derived from `single_listing_price` and whose minimum discount defaults to 5%.

**Architecture:** Keep the existing Admin “Rules and Prices” persistence pattern (`platform_rules` stored in Commerce service settings) but add a typed server-side parser/quote layer so application routes consume one normalized rule model rather than UI constants. New model products (Story packs, annual business presence, Market Floor entry) are quoted server-side from that rule model and the resolved commercial terms are snapshotted into the persisted local order. Market Floor stops using `market_floor_wallets`; an owned active listing is evaluated before payment, then a canonical `market_floor_entry` order is created only for an approved/payment-ready request. Successful payment activates 24 hours of Market Floor display. Existing scoring remains a quality/ranking aid, not a free-card economy.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, Cloudflare D1/SQLite, existing Commerce/admin proxy, existing Market Floor scoring, Node contract tests.

**Spec:** `docs/superpowers/specs/2026-08-30-stories-revenue-credit-design.md`

## Dependencies

- Run after `2026-08-31-credit-ledger-story-packs.md` and `2026-08-31-business-presence-content.md` so the Admin rule set can describe the real products already introduced.
- Complete the central rule parser/quote tasks before `2026-08-31-story-runtime-ranking-viewer.md`, which consumes Story enablement/duration from these rules.

## Global Constraints

- Market Floor entry price has no independent editable numeric field. It is always `single_listing_price` at order creation.
- Initial/default `single_listing_price` remains 149,000 Toman; therefore default Market Floor entry is 149,000 Toman.
- Minimum Market Floor discount is admin-editable, default 5%.
- `market_floor_wallets`/free cards are retired behavior. Keep the historical table/migration for compatibility; stop reading/writing it. Do not destructively drop it in this rollout.
- Do not charge a listing credit for Market Floor.
- Do not charge a user for a Market Floor request that is already rejected by ownership/status/minimum-discount/quality moderation gates. Payment comes after a request is `payment_ready`.
- Once a paid Market Floor entry activates, it receives a full 24-hour display window from payment settlement; do not preempt a paid active entry because another score is higher.
- Existing selected categories remain exactly the existing product rules: selected showroom, luxury vehicle, free-zone vehicle, selected business. Do not add selected service/portfolio/part/Story.
- Remove “ویترین” product terminology, six-month business package, free business trial, and Card-Day from active revenue/admin/docs surfaces.
- Purchased listing and Story credit packs have no expiry; annual free listing quotas remain annual.
- Admin changes affect new quotes/orders only. A paid/pending order must retain the server-resolved commercial terms captured when it was created.

---

## Task 1: Add a typed canonical platform-rules parser and product quote model

**Files:**
- Create: `lib/platform-rules.ts`
- Create: `lib/platform-product-quote.ts`
- Create: `tests/platform-rules-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write RED tests for defaults and sanitization**

Define the canonical normalized shape with these defaults:

```ts
export const DEFAULT_PLATFORM_RULES = {
  personal_free_listings_yearly: 2,
  dealer_free_listings_yearly: 3,
  single_listing_price: 149_000,

  economic_listing_count: 25,
  economic_discount_percent: 10,
  economic_price: 3_352_500,
  smart_listing_count: 50,
  smart_discount_percent: 15,
  smart_price: 6_332_500,
  professional_listing_count: 100,
  professional_discount_percent: 20,
  professional_price: 11_920_000,

  story_enabled: true,
  story_pack_25_count: 25,
  story_pack_25_price: 250_000,
  story_pack_50_count: 50,
  story_pack_50_price: 450_000,
  story_pack_100_count: 100,
  story_pack_100_price: 800_000,
  story_duration_hours: 24,

  business_presence_12m_price: 990_000,
  business_profile_gallery_limit: 6,
  business_portfolio_base_capacity: 20,
  business_portfolio_hard_capacity: 100,
  parts_catalog_base_capacity: 50,
  parts_catalog_hard_capacity: 200,
  business_media_grace_months: 6,

  market_floor_min_discount_percent: 5,

  require_listing_approval: true,
  require_dealer_approval: true,
  require_service_business_approval: true,
  restore_credit_on_admin_rejection: true,
  local_first_enabled: true,
  nationwide_fallback_enabled: true,
} as const;
```

Keep existing referral/bump/selected fields that are still active in current product rules; the example above lists the fields changed by this design, not a license to delete unrelated approved rules.

Sanitization tests must reject negative prices/counts, enforce hard capacity >= base capacity, and keep Story duration positive.

- [ ] **Step 2: Run RED**

```bash
node --test tests/platform-rules-contract.test.mjs
```

- [ ] **Step 3: Implement pure normalization**

```ts
export function normalizePlatformRules(value: unknown): PlatformRules;
export function platformRulesFromCommerceServices(services: unknown[]): PlatformRules;
```

Find the first service with `settings.platform_rules` exactly as the Admin page does; merge only recognized keys over defaults. Ignore unknown objects and browser-supplied rules.

- [ ] **Step 4: Implement server-owned quotes for new products**

```ts
export type PlatformProductCode =
  | "story_pack_25"
  | "story_pack_50"
  | "story_pack_100"
  | "business_presence_12m"
  | "market_floor_entry";

export function quotePlatformProduct(code: PlatformProductCode, rules: PlatformRules) {
  switch (code) {
    case "story_pack_25":
      return { amountToman: rules.story_pack_25_price, creditQuantity: rules.story_pack_25_count, assetCode: "story_credit" };
    case "story_pack_50":
      return { amountToman: rules.story_pack_50_price, creditQuantity: rules.story_pack_50_count, assetCode: "story_credit" };
    case "story_pack_100":
      return { amountToman: rules.story_pack_100_price, creditQuantity: rules.story_pack_100_count, assetCode: "story_credit" };
    case "business_presence_12m":
      return { amountToman: rules.business_presence_12m_price, durationMonths: 12 };
    case "market_floor_entry":
      return { amountToman: rules.single_listing_price, durationHours: 24, minDiscountPercent: rules.market_floor_min_discount_percent };
  }
}
```

The Market Floor quote intentionally has no `market_floor_price` key.

- [ ] **Step 5: Run GREEN, add test to `test:contracts`, commit**

```bash
node --test tests/platform-rules-contract.test.mjs
npm run check:launch

git add lib/platform-rules.ts lib/platform-product-quote.ts tests/platform-rules-contract.test.mjs package.json
git commit -m "feat: centralize platform revenue rules"
```

---

## Task 2: Expose canonical rules to authenticated server flows

**Files:**
- Create: `lib/commerce-platform-rules.ts`
- Modify: `lib/staging-demo-commerce.ts`
- Create: `tests/commerce-platform-rules-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED loader tests**

Assert the loader:
- uses `buildStagingDemoCommerce()` only for the explicit staging demo session/hostname;
- otherwise fetches the authenticated Commerce catalog using existing `authApiUrl` + `requestIdentityHeaders` boundaries;
- passes service settings into `platformRulesFromCommerceServices()`;
- never accepts `platform_rules` from a request body.

- [ ] **Step 2: Run RED**

```bash
node --test tests/commerce-platform-rules-contract.test.mjs
```

- [ ] **Step 3: Put the same default `platform_rules` object into the staging Commerce anchor**

Staging demo service output must include a service with:

```ts
settings: {
  staging_demo: true,
  platform_rules: { ...DEFAULT_PLATFORM_RULES },
}
```

All demo product amounts should be constructed from `quotePlatformProduct()` for Story packs/business presence/Market Floor so Admin-rule tests cannot silently drift from demo checkout.

- [ ] **Step 4: Implement `loadPlatformRules(request)`**

Return defaults only when the Commerce payload is valid but does not yet have stored rules. If the real Commerce service itself is unavailable, return a typed error for purchase/publish routes rather than silently quoting a potentially stale price.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test tests/commerce-platform-rules-contract.test.mjs tests/staging-demo-commerce.test.mjs
npm run check:launch

git add lib/commerce-platform-rules.ts lib/staging-demo-commerce.ts tests/commerce-platform-rules-contract.test.mjs package.json
git commit -m "feat: load canonical commerce platform rules"
```

---

## Task 3: Make new product orders snapshot server-resolved terms

**Files:**
- Modify: `app/api/finance/orders/route.ts`
- Modify: `lib/commerce-product-effects.ts`
- Modify: `tests/finance-commerce-contract.test.mjs`
- Modify: `tests/commerce-credit-fulfillment-contract.test.mjs`
- Create: `tests/platform-product-order-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED order tests**

For the five platform product codes, assert the order route calls `loadPlatformRules()` + `quotePlatformProduct()` and persists these server-generated metadata keys:

```json
{
  "quote_source": "platform_rules",
  "quoted_amount_toman": 250000,
  "credit_asset_code": "story_credit",
  "credit_quantity": 25
}
```

or the relevant duration/Market Floor terms. Assert request body `amount_toman`, `credit_quantity`, or `duration_hours` cannot override them.

- [ ] **Step 2: Run RED**

```bash
node --test tests/platform-product-order-contract.test.mjs tests/finance-commerce-contract.test.mjs
```

- [ ] **Step 3: Add a local canonical-order path for these product codes**

After ownership/target validation, create the local `commerceOrders` row with `amountToman/finalAmountToman` from the platform quote. Existing legacy products can continue through current upstream Commerce order creation until separately migrated.

Preserve affiliate behavior only where the current approved affiliate rules explicitly apply; do not silently give Story/Market Floor referral discounts unless their product classification already qualifies under canonical rules.

- [ ] **Step 4: Fix Story pack fulfillment to use the order-time server snapshot**

Do **not** grant a hardcoded 25/50/100 if Admin can change pack counts. `commerce-product-effects.ts` must require:

```ts
order.productCode in STORY_PACK_CODES
metadata.quote_source === "platform_rules"
metadata.credit_asset_code === "story_credit"
Number.isSafeInteger(metadata.credit_quantity) && metadata.credit_quantity > 0
```

Then grant exactly the persisted server-resolved quantity. A later Admin price/count change must not alter an already-created order's entitlement.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test tests/platform-product-order-contract.test.mjs tests/commerce-credit-fulfillment-contract.test.mjs tests/finance-commerce-contract.test.mjs
npm run check:launch

git add app/api/finance/orders/route.ts lib/commerce-product-effects.ts tests/platform-product-order-contract.test.mjs tests/finance-commerce-contract.test.mjs tests/commerce-credit-fulfillment-contract.test.mjs package.json
git commit -m "feat: snapshot canonical product terms in orders"
```

---

## Task 4: Replace obsolete Admin rule sections with the approved model

**Files:**
- Modify: `app/admin/rules/page.tsx`
- Modify: `tests/admin-commerce-contract.test.mjs` or create `tests/admin-platform-rules-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED UI contracts**

Assert Admin rules contains sections for:
- listing/free credits;
- listing credit packs with no-expiry language;
- Story packs and Story duration/enablement;
- annual business presence + storage capacities/retention;
- Market Floor minimum discount with a read-only explanation that price equals single-listing price;
- existing approvals/location/referral/approved promotion rules.

Assert absence of:

```text
ویترین کسب‌وکارها
ویترین ۶ ماهه
service_showcase_6_month_price
service_trial_days
کارت روز
اعتبار یک‌ساله
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/admin-platform-rules-contract.test.mjs
```

- [ ] **Step 3: Replace defaults with `DEFAULT_PLATFORM_RULES`**

Import/use the shared rule defaults where client bundling allows it; if client/server module boundaries prevent direct import, put a serializable shared constants module under `lib/platform-rules-shared.ts` and make both server/client use it. Do not duplicate numeric defaults in two files.

- [ ] **Step 4: Build explicit Story/business/Market Floor sections**

Story fields:

```text
story_enabled
story_pack_25_count / story_pack_25_price
story_pack_50_count / story_pack_50_price
story_pack_100_count / story_pack_100_price
story_duration_hours
```

Business fields:

```text
business_presence_12m_price
business_profile_gallery_limit
business_portfolio_base_capacity / hard_capacity
parts_catalog_base_capacity / hard_capacity
business_media_grace_months
```

Market Floor field:

```text
market_floor_min_discount_percent
```

Show derived Market Floor price in descriptive UI from current `single_listing_price`; do not make it an input.

- [ ] **Step 5: Validate relationships before saving**

Block save if base capacity > hard capacity, Story counts/prices invalid, or grace months <= 0. Keep current `pricing_manage` access check and central `platform_rules_updated_at` persistence.

- [ ] **Step 6: Run GREEN and commit**

```bash
node --test tests/admin-platform-rules-contract.test.mjs
npm run check:launch

git add app/admin/rules/page.tsx tests/admin-platform-rules-contract.test.mjs package.json
git commit -m "feat: align admin rules with final revenue model"
```

---

## Task 5: Clean Commerce/admin product semantics without inventing new “selected” types

**Files:**
- Modify: `app/admin/commerce/CommerceAdminClient.tsx`
- Modify: `app/admin/stories/page.tsx` only if copy/navigation needs updating
- Modify: `app/account/services/CommerceCenter.tsx`
- Modify: `lib/staging-demo-commerce.ts`
- Create: `tests/final-commerce-catalog-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED product-catalog contracts**

Assert active new-model products include Story packs, one annual business presence product, Market Floor entry, and the already-approved selected products. Assert there is no single `listing_story`, no 6-month profile/showcase product, and no Card-Day product.

Assert no service key/title implies selected portfolio, selected part, selected service, or selected Story.

- [ ] **Step 2: Run RED**

```bash
node --test tests/final-commerce-catalog-contract.test.mjs
```

- [ ] **Step 3: Update grouping/copy**

Admin Story section is packages/credits, not province-specific one-off Story pricing. Business presence is “حضور یک‌ساله کسب‌وکار”, not “ویترین”. Market Floor describes one paid entry tied to listing price.

Do not alter existing selected-showroom/luxury/free-zone/business rules beyond removing generic obsolete copy that contradicts their already-written rules.

- [ ] **Step 4: Run GREEN and commit**

```bash
node --test tests/final-commerce-catalog-contract.test.mjs tests/finance-commerce-contract.test.mjs
npm run check:launch

git add app/admin/commerce/CommerceAdminClient.tsx app/admin/stories/page.tsx app/account/services/CommerceCenter.tsx lib/staging-demo-commerce.ts tests/final-commerce-catalog-contract.test.mjs package.json
git commit -m "refactor: align commerce catalog with final products"
```

---

## Task 6: Add Market Floor payment linkage without deleting historical card tables

**Files:**
- Create: `drizzle/0012_market_floor_commerce.sql`
- Modify: `db/schema.ts`
- Modify: `tests/migration-chain-contract.test.mjs`
- Modify: `tests/market-floor-contract.test.mjs`
- Create: `tests/market-floor-payment-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED migration/payment contracts**

New `market_floor_entries` columns:

```text
order_id nullable unique
payment_state default 'not_required' or 'unpaid' for new flow
payment_ready_at nullable
paid_at nullable
```

Do not drop `market_floor_wallets`; assert runtime code no longer imports/uses it after Task 7.

- [ ] **Step 2: Run RED**

```bash
node --test tests/migration-chain-contract.test.mjs tests/market-floor-contract.test.mjs tests/market-floor-payment-contract.test.mjs
```

- [ ] **Step 3: Create additive migration**

```sql
ALTER TABLE `market_floor_entries` ADD `order_id` integer;
ALTER TABLE `market_floor_entries` ADD `payment_state` text DEFAULT 'unpaid' NOT NULL;
ALTER TABLE `market_floor_entries` ADD `payment_ready_at` text;
ALTER TABLE `market_floor_entries` ADD `paid_at` text;
CREATE UNIQUE INDEX `market_floor_entries_order_unique`
  ON `market_floor_entries` (`order_id`)
  WHERE `order_id` IS NOT NULL;
```

If the D1 SQLite version used by repository verification rejects a partial unique index, create a normal unique index; SQLite allows multiple NULLs in a unique column.

- [ ] **Step 4: Mirror columns in `db/schema.ts`, update migration tail and run D1 verification**

```bash
node --test tests/migration-chain-contract.test.mjs tests/market-floor-payment-contract.test.mjs
npm run d1:verify
```

- [ ] **Step 5: Commit**

```bash
git add drizzle/0012_market_floor_commerce.sql db/schema.ts tests/migration-chain-contract.test.mjs tests/market-floor-contract.test.mjs tests/market-floor-payment-contract.test.mjs package.json
git commit -m "feat: link market floor entries to payments"
```

---

## Task 7: Replace free Market Floor cards with preflight → payment-ready flow

**Files:**
- Modify: `lib/market-floor.ts`
- Rewrite: `app/api/market-floor/route.ts`
- Modify: `app/api/market-floor/public/route.ts`
- Modify: `tests/market-floor-contract.test.mjs`
- Modify: `tests/market-floor-payment-contract.test.mjs`

- [ ] **Step 1: Change current card contracts to RED**

Remove assertions/behavior for:

```text
MARKET_FLOOR_INITIAL_CARDS
marketFloorWallets
availableCards
cardReturned
کارت کف بازار کافی ندارید
```

Add assertions for `loadPlatformRules`, `market_floor_min_discount_percent`, `payment_ready`, and no listing-credit debit.

- [ ] **Step 2: Run RED**

```bash
node --test tests/market-floor-contract.test.mjs tests/market-floor-payment-contract.test.mjs
```

- [ ] **Step 3: Add a minimum-discount hard gate before scoring**

Use the server-derived snapshot:

```ts
const discountPercent = snapshot.marketReferenceToman > 0
  ? ((snapshot.marketReferenceToman - snapshot.priceToman) / snapshot.marketReferenceToman) * 100
  : 0;

if (discountPercent < rules.market_floor_min_discount_percent) {
  return jsonResponse({
    success: false,
    code: "market_floor_discount_too_low",
    minimum_discount_percent: rules.market_floor_min_discount_percent,
  }, 409);
}
```

If comparable market price is unavailable, keep the existing human-review path; do not charge before admin approval.

- [ ] **Step 4: Replace POST card consumption with request state**

Flow:
1. authenticate + verify owned active listing;
2. load canonical rules;
3. minimum-discount gate;
4. evaluate existing quality score;
5. `rejected` → persist rejected request, no order;
6. `human_review` → persist `pending_admin`, no order;
7. `approved` → persist `payment_ready`, no activation window yet.

Do not displace a currently paid active entry. The existing score can sort paid active entries and aid admin review, but it no longer grants a free card or preempts paid time.

- [ ] **Step 5: Remove hard province-capacity displacement from paid activation semantics**

`MARKET_FLOOR_PROVINCE_CAPACITY` may remain as a UI fetch/display batch size if useful, but it must not make a paid entry lose part of its 24-hour term. Public API can paginate/sort all active paid entries; the first page may still be limited for performance.

- [ ] **Step 6: Run GREEN and commit**

```bash
node --test tests/market-floor-contract.test.mjs tests/market-floor-payment-contract.test.mjs
npm run check:launch

git add lib/market-floor.ts app/api/market-floor/route.ts app/api/market-floor/public/route.ts tests/market-floor-contract.test.mjs tests/market-floor-payment-contract.test.mjs
git commit -m "refactor: make market floor payment ready"
```

---

## Task 8: Create Market Floor Commerce orders only for payment-ready owned entries

**Files:**
- Modify: `app/api/finance/orders/route.ts`
- Modify: `tests/platform-product-order-contract.test.mjs`
- Modify: `tests/market-floor-payment-contract.test.mjs`

- [ ] **Step 1: Add RED ownership/state tests**

`market_floor_entry` orders require `market_floor_entry_id`, current owner key match, and entry status `payment_ready`. Reject rejected/pending-admin/active/expired entries and entries owned by another scope.

- [ ] **Step 2: Run RED**

```bash
node --test tests/platform-product-order-contract.test.mjs tests/market-floor-payment-contract.test.mjs
```

- [ ] **Step 3: Persist canonical quote and order link**

Quote `market_floor_entry` through `quotePlatformProduct()` so `amountToman === rules.single_listing_price`. Persist metadata:

```json
{
  "quote_source": "platform_rules",
  "market_floor_entry_id": 91,
  "single_listing_price_snapshot": 149000,
  "market_floor_min_discount_snapshot": 5,
  "duration_hours": 24
}
```

After order creation, set `market_floor_entries.order_id` and `payment_state = "pending_payment"`. Idempotent retry returns the same order/entry link.

- [ ] **Step 4: Run GREEN and commit**

```bash
node --test tests/platform-product-order-contract.test.mjs tests/market-floor-payment-contract.test.mjs
npm run check:launch

git add app/api/finance/orders/route.ts tests/platform-product-order-contract.test.mjs tests/market-floor-payment-contract.test.mjs
git commit -m "feat: create canonical market floor orders"
```

---

## Task 9: Activate Market Floor for a full 24 hours only after paid settlement

**Files:**
- Modify: `lib/commerce-product-effects.ts`
- Modify: `app/api/payments/verify/route.ts`
- Modify: `tests/market-floor-payment-contract.test.mjs`
- Modify: `tests/commerce-credit-fulfillment-contract.test.mjs`

- [ ] **Step 1: Add RED settlement tests**

For persisted `market_floor_entry` order, assert paid product effect updates exactly its linked owned entry:

```text
status = active
payment_state = paid
paid_at = paidAt
cycle_starts_at = paidAt
cycle_ends_at = paidAt + 24 hours
activated_at = paidAt
```

Replay of already-paid verification must not extend the 24-hour window again.

- [ ] **Step 2: Run RED**

```bash
node --test tests/market-floor-payment-contract.test.mjs tests/commerce-credit-fulfillment-contract.test.mjs
```

- [ ] **Step 3: Implement idempotent paid effect**

Require `entry.orderId === order.id`. If entry is already `payment_state = paid`, return without changing timestamps. Otherwise apply the order-time duration snapshot (validated 24 in current product rules) and activate.

- [ ] **Step 4: Run GREEN and commit**

```bash
node --test tests/market-floor-payment-contract.test.mjs tests/commerce-credit-fulfillment-contract.test.mjs
npm run check:launch

git add lib/commerce-product-effects.ts app/api/payments/verify/route.ts tests/market-floor-payment-contract.test.mjs tests/commerce-credit-fulfillment-contract.test.mjs
git commit -m "feat: activate paid market floor entries"
```

---

## Task 10: Update Market Floor account UI from card balance to explicit price/checkout

**Files:**
- Modify: `app/account/market-floor/page.tsx` and/or its client component discovered on the implementation branch
- Modify: related CSS module
- Modify: `app/market-floor/page.tsx` only for user-facing CTA/copy if necessary
- Modify: `tests/market-floor-contract.test.mjs`

- [ ] **Step 1: Add RED UI assertions**

Assert no “cards remaining” UI. Show:
- minimum required discount from API rules;
- current Market Floor entry price as “هم‌قیمت تک‌آگهی” + formatted canonical amount;
- state-specific CTA: submit for review, awaiting admin, pay/activate, active timer.

- [ ] **Step 2: Run RED**

```bash
node --test tests/market-floor-contract.test.mjs
```

- [ ] **Step 3: Wire payment-ready CTA to standard checkout**

The UI passes product code/entry ID only; never amount. The 24-hour countdown starts from returned paid/active timestamps, not submission time.

- [ ] **Step 4: Run GREEN and commit**

```bash
node --test tests/market-floor-contract.test.mjs
npm run check:launch

git add app/account/market-floor app/market-floor tests/market-floor-contract.test.mjs
git commit -m "feat: sell market floor entry through checkout"
```

---

## Task 11: Update canonical revenue documentation and remove obsolete terminology

**Files:**
- Modify: `docs/revenue-model-fa.md`
- Modify: `docs/MASTER-SITEMAP-FA.md` only if obsolete Showcase/Card-Day routes/copy remain
- Modify: other active docs found with `rg "ویترین|کارت روز|365|۳۶۵|اعتبار یک‌ساله|service_showcase_6" docs app tests`
- Create: `tests/revenue-doc-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED documentation contract**

Assert canonical revenue doc states:
- purchased credit packs have no expiry;
- free annual quotas still reset annually;
- Story pack 25/50/100 defaults and no single Story;
- service/parts annual presence 990,000 initial, one 12-month product;
- Dealer base presence free/permanent;
- no 6-month Showcase/“ویترین” product;
- no Card-Day;
- Market Floor price derives from single listing and minimum discount default 5%;
- business structured-content capacities/retention summary;
- selected types are only existing approved categories.

- [ ] **Step 2: Run RED**

```bash
node --test tests/revenue-doc-contract.test.mjs
```

- [ ] **Step 3: Rewrite conflicting sections in `docs/revenue-model-fa.md`**

Do not leave the old 365-day purchased-credit rule elsewhere in the same canonical document. Use explicit distinction between `پکیج اعتباری` and `سرویس مدت‌دار`.

- [ ] **Step 4: Run GREEN and commit**

```bash
node --test tests/revenue-doc-contract.test.mjs
npm run check:launch

git add docs tests/revenue-doc-contract.test.mjs package.json
git commit -m "docs: align canonical revenue model"
```

---

## Task 12: Full verification and staging-only PR

**Files:**
- Modify at end: `AI_HANDOFF.md`

- [ ] **Step 1: Run full verification**

```bash
npm run check:launch
npm run d1:verify
npm run build:cloudflare
npm run build:cpanel
```

- [ ] **Step 2: Update `AI_HANDOFF.md` with actual evidence**

Record the exact migration count, Market Floor tests, rules/catalog tests, build outputs, feature branch, PR, deployment state, and next action.

- [ ] **Step 3: Open PR to `agent/launch-3-local-baseline` and wait for explicit merge approval**

- [ ] **Step 4: Verify staging after approved merge/deploy**

Use fixtures/demo only. Verify:
- Admin changes Story pack price/count and new orders snapshot the new values;
- existing order retains prior snapshot;
- business annual price shown as 990,000 default;
- no 6-month Showcase/Card-Day UI;
- Market Floor quote exactly equals current `single_listing_price`;
- changing single listing price changes the next Market Floor quote automatically;
- 5% minimum discount gate works;
- no free Market Floor card balance exists;
- paid demo Market Floor entry receives exactly 24 hours;
- no Production/domain/data changes.
