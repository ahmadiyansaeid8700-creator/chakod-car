# Business Presence and Structured Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved 12-month paid presence model for service businesses and parts stores, plus bounded structured content: service portfolios/Before-After and parts advertising cards with one-time media moderation and six-month post-expiry media retention.

**Architecture:** `account_activities` remains the identity/ownership record. A new `business_presence_entitlements` table controls whether non-dealer business identities are publicly publishable. Structured content is normalized into portfolio/part-card rows that reference moderated media assets; public APIs never read unapproved assets. The existing lightweight resume remains the profile header and six-image intro gallery. Dealer identities are explicitly exempt from annual presence. Expiry unpublishes without deleting account/finance data. A retention queue hides expired media at the six-month boundary and physically deletes it through an explicit storage adapter; Production launch is blocked until the real deletion adapter is configured and verified.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, Cloudflare D1/SQLite, existing authenticated media proxy, CSS Modules, Node contract tests.

**Spec:** `docs/superpowers/specs/2026-08-30-stories-revenue-credit-design.md`

## Dependencies

- Implement after `2026-08-31-credit-ledger-story-packs.md` Task 6 so payment settlement has a single product-effects extension point.
- This plan must land before `2026-08-31-story-runtime-ranking-viewer.md`, because Story publication from businesses depends on active presence and approved structured media.

## Global Constraints

- Work on a fresh feature branch from the exact current staging SHA after Plan 1 has merged; never branch from the docs branch or `main` for implementation.
- Service businesses and parts stores require one active 12-month presence term. Current initial price is 990,000 Toman; price is server/admin controlled.
- Dealers are business identities but never require this annual presence product.
- Expiry must not delete the account, business profile, text content, wallet, credits, orders, invoices, or ledger.
- Purchased Story credits remain usable as an asset after business expiry, but that expired business cannot publish a new Story until renewed.
- Base capacities in v1: service portfolio 20, parts cards 50, intro gallery 6. Hard maxima: service 100, parts 200. Capacity-upgrade products are explicitly out of scope.
- Parts content is advertising only: no cart, no part checkout, no order fulfillment, no platform-mediated part sale.
- Every newly uploaded business-content image is `pending` until one admin moderation decision. Replacing an image creates/re-registers a pending asset; approval does not automatically carry to a new file.
- A Before/After pair is one portfolio item and later one Story frame/credit even though it references two approved assets.
- The six-month retention rule applies to heavy images only. Textual card/portfolio metadata survives.
- Do not pretend a database row deletion physically deletes an external upload. Physical deletion must be an explicit storage operation with evidence.

---

## Task 1: Add business-presence and structured-content schema

**Files:**
- Create: `drizzle/0011_business_presence_content.sql`
- Modify: `db/schema.ts`
- Modify: `tests/migration-chain-contract.test.mjs`
- Create: `tests/business-presence-schema-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED schema contracts**

Assert `0011_business_presence_content.sql` is the migration tail and creates these tables:

```text
business_activity_resumes
business_presence_entitlements
business_content_assets
business_portfolio_items
business_part_cards
business_media_purge_queue
```

The existing runtime-created `business_activity_resumes` table must be represented with `CREATE TABLE IF NOT EXISTS` using its current compatible columns; no destructive migration is allowed.

- [ ] **Step 2: Run RED**

```bash
node --test tests/migration-chain-contract.test.mjs tests/business-presence-schema-contract.test.mjs
```

- [ ] **Step 3: Create the additive migration**

Use the following data contracts:

```sql
CREATE TABLE IF NOT EXISTS `business_activity_resumes` (
  `activity_id` integer PRIMARY KEY NOT NULL,
  `owner_user_id` integer NOT NULL,
  `headline` text DEFAULT '' NOT NULL,
  `about` text DEFAULT '' NOT NULL,
  `specialties_json` text DEFAULT '[]' NOT NULL,
  `gallery_json` text DEFAULT '[]' NOT NULL,
  `published` integer DEFAULT 1 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `business_presence_entitlements` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `activity_id` integer NOT NULL UNIQUE,
  `last_order_id` integer NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `starts_at` text NOT NULL,
  `expires_at` text NOT NULL,
  `grace_ends_at` text NOT NULL,
  `media_purged_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `business_content_assets` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `activity_id` integer NOT NULL,
  `kind` text NOT NULL,
  `storage_url` text NOT NULL,
  `review_status` text DEFAULT 'pending' NOT NULL,
  `review_reason` text DEFAULT '' NOT NULL,
  `reviewed_by` text DEFAULT '' NOT NULL,
  `reviewed_at` text,
  `purged_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `business_portfolio_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `activity_id` integer NOT NULL,
  `item_type` text NOT NULL,
  `title` text DEFAULT '' NOT NULL,
  `caption` text DEFAULT '' NOT NULL,
  `primary_asset_id` integer NOT NULL,
  `secondary_asset_id` integer,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `business_part_cards` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `activity_id` integer NOT NULL,
  `image_asset_id` integer,
  `name` text NOT NULL,
  `brand` text DEFAULT '' NOT NULL,
  `compatible_models_json` text DEFAULT '[]' NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `availability` text DEFAULT 'available' NOT NULL,
  `price_mode` text NOT NULL,
  `price_toman` integer,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `business_media_purge_queue` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `asset_id` integer NOT NULL UNIQUE,
  `storage_url` text NOT NULL,
  `due_at` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `attempts` integer DEFAULT 0 NOT NULL,
  `last_error` text DEFAULT '' NOT NULL,
  `deleted_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

Add indexes on activity/status fields used by public/admin queries.

- [ ] **Step 4: Mirror the migration in `db/schema.ts`**

Export `businessActivityResumes`, `businessPresenceEntitlements`, `businessContentAssets`, `businessPortfolioItems`, `businessPartCards`, and `businessMediaPurgeQueue`.

- [ ] **Step 5: Add the new contract test to `test:contracts`, run GREEN and D1 verification**

```bash
node --test tests/migration-chain-contract.test.mjs tests/business-presence-schema-contract.test.mjs
npm run d1:verify
```

Expected: 12 migrations through `0011_business_presence_content.sql`.

- [ ] **Step 6: Commit**

```bash
git add drizzle/0011_business_presence_content.sql db/schema.ts tests/migration-chain-contract.test.mjs tests/business-presence-schema-contract.test.mjs package.json
git commit -m "feat: add business presence content schema"
```

---

## Task 2: Move business-resume schema ownership out of runtime code and enforce six intro images

**Files:**
- Modify: `lib/business-resume.ts`
- Modify: `app/account-v2/businesses/[id]/BusinessResumeEditor.tsx`
- Modify: `tests/native-business-moderation-contract.test.mjs`
- Create: `tests/business-resume-capacity-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED tests**

Assert:
- `lib/business-resume.ts` no longer issues `CREATE TABLE` or `CREATE INDEX` at request time;
- gallery normalization slices to 6, not 12;
- UI displays `از ۶ تصویر` and blocks upload at 6;
- visible copy no longer uses “ویترین” for the resume/gallery.

- [ ] **Step 2: Run RED**

```bash
node --test tests/business-resume-capacity-contract.test.mjs tests/native-business-moderation-contract.test.mjs
```

- [ ] **Step 3: Refactor `lib/business-resume.ts`**

Remove `ensureBusinessResumeSchema()` and rely on the additive migration. Keep read/write SQL compatible with existing rows. Change only profile-gallery normalization:

```ts
for (let index = 0; index < rawGallery.length && gallery.length < 6; index += 1) {
  // existing URL/id/title/caption normalization
}
```

- [ ] **Step 4: Update the editor**

Change `galleryCountText` and upload guard from 12 to 6. Replace “ویترین و آلبوم” with “صفحه معرفی و آلبوم”. Do not put service portfolio or parts catalog items into this six-image profile gallery; those get their own manager later in this plan.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test tests/business-resume-capacity-contract.test.mjs tests/native-business-moderation-contract.test.mjs
npm run check:launch

git add lib/business-resume.ts app/account-v2/businesses/[id]/BusinessResumeEditor.tsx tests/business-resume-capacity-contract.test.mjs tests/native-business-moderation-contract.test.mjs package.json
git commit -m "refactor: bound business profile gallery"
```

---

## Task 3: Implement annual business-presence entitlement rules and Dealer exemption

**Files:**
- Create: `lib/business-presence.ts`
- Modify: `lib/commerce-product-effects.ts`
- Modify: `app/api/payments/verify/route.ts`
- Modify: `lib/staging-demo-commerce.ts`
- Create: `tests/business-presence-contract.test.mjs`
- Modify: `tests/commerce-credit-fulfillment-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write RED tests for business rules**

Required pure API:

```ts
export const BUSINESS_PRESENCE_PRODUCT = "business_presence_12m";
export const BUSINESS_PRESENCE_MONTHS = 12;
export const BUSINESS_MEDIA_GRACE_MONTHS = 6;
export function addCalendarMonths(iso: string, months: number): string;
export function nextPresenceWindow(input: { paidAt: string; currentExpiresAt?: string | null }): {
  startsAt: string;
  expiresAt: string;
  graceEndsAt: string;
};
export function requiresPaidPresence(activityType: string): boolean;
```

Assert `requiresPaidPresence("dealer") === false`, and `parts_store`, `repair_shop`, `car_service` are true.

Renewal rule:
- if current expiry is in the future, extend 12 calendar months from current expiry;
- otherwise start at payment timestamp;
- grace ends 6 calendar months after new expiry.

- [ ] **Step 2: Run RED**

```bash
node --test tests/business-presence-contract.test.mjs
```

- [ ] **Step 3: Implement the pure presence helper**

Use UTC calendar arithmetic, not `365 * 24h`, so a 12-month product remains 12 calendar months.

- [ ] **Step 4: Replace old staging 6m/12m “professional profile” products**

`lib/staging-demo-commerce.ts` must expose one service only:

```ts
{
  service_key: "business_presence_12m",
  title: "حضور یک‌ساله کسب‌وکار",
  audience: "business",
  amount_toman: 990_000,
  duration_value: 12,
  duration_unit: "month",
  is_active: true,
  settings: { staging_demo: true, presence_months: 12 },
}
```

Remove `professional_profile_6m` and `professional_profile_12m`.

- [ ] **Step 5: Extend paid product effects**

Add a `paidBusinessPresenceEffect(order, activityId, now)` helper that upserts `businessPresenceEntitlements`. Do not derive `activityId` from client-supplied price metadata; the persisted order must contain a server-verified managed activity target.

The payment verify batch for `business_presence_12m` must include the entitlement upsert in the same local settlement transaction. Replayed paid verification recalculates nothing if `last_order_id` already equals this order; the order can only extend presence once.

- [ ] **Step 6: Run GREEN**

```bash
node --test tests/business-presence-contract.test.mjs tests/commerce-credit-fulfillment-contract.test.mjs tests/staging-demo-commerce.test.mjs
npm run check:launch
```

- [ ] **Step 7: Commit**

```bash
git add lib/business-presence.ts lib/commerce-product-effects.ts app/api/payments/verify/route.ts lib/staging-demo-commerce.ts tests/business-presence-contract.test.mjs tests/commerce-credit-fulfillment-contract.test.mjs tests/staging-demo-commerce.test.mjs package.json
git commit -m "feat: add annual business presence entitlement"
```

---

## Task 4: Bind Commerce orders to native business activities instead of dealer-only IDs

**Files:**
- Modify: `app/api/finance/orders/route.ts`
- Create: `lib/managed-activity.ts`
- Create: `tests/business-commerce-order-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED ownership tests**

The order route must accept `activity_id` for `business_presence_12m`, resolve the authenticated user, load that `accountActivities` row, and require owner access. It must reject Dealer activity for this product.

Expected persisted metadata:

```json
{
  "target_type": "activity",
  "activity_id": 12,
  "activity_type": "parts_store",
  "activity_name": "..."
}
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/business-commerce-order-contract.test.mjs
```

- [ ] **Step 3: Implement `loadManagedActivity(request, activityId)`**

Resolve the authenticated user identity using the same account/session boundary already used for native account activities. Query `accountActivities` by `id` and verify `ownerUserId`; do not grant annual presence to a staff/member just because they can operate the business UI.

- [ ] **Step 4: Extend order creation**

For `business_presence_12m`, require `activity_id`, verify non-dealer type, and persist server-derived target metadata. All prices still come from Commerce/staging catalog; ignore browser amount.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test tests/business-commerce-order-contract.test.mjs tests/finance-commerce-contract.test.mjs
npm run check:launch

git add app/api/finance/orders/route.ts lib/managed-activity.ts tests/business-commerce-order-contract.test.mjs package.json
git commit -m "feat: bind business presence orders to activities"
```

---

## Task 5: Gate public native-business discovery on approval plus active presence

**Files:**
- Modify: `app/api/businesses/route.ts`
- Modify: `app/api/business-resumes/[id]/route.ts`
- Modify: `tests/native-business-moderation-contract.test.mjs`
- Create: `tests/business-presence-publication-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Change the existing “approval activates publication” contract to RED**

The new rule is:

```text
service/parts public = accountActivities.status == active
                       AND verificationStatus == verified
                       AND businessPresenceEntitlements.status == active
                       AND expiresAt > now

dealer public = existing dealer rules; no annual presence dependency
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/native-business-moderation-contract.test.mjs tests/business-presence-publication-contract.test.mjs
```

- [ ] **Step 3: Add a shared `hasActiveBusinessPresence(activityId, now)` query**

Use `businessPresenceEntitlements`. If an entitlement is past `expiresAt`, treat it as expired even if a housekeeping job has not updated `status` yet.

- [ ] **Step 4: Apply the gate to native public list/detail routes**

Do not remove fixture behavior when staging fixtures are explicitly enabled. Real native activities without an active presence must not be mixed into public discovery.

- [ ] **Step 5: Return account-facing status instead of deleting data**

Private management routes should still return the business and its content plus:

```json
{
  "presence": {
    "status": "expired",
    "expires_at": "...",
    "grace_ends_at": "...",
    "can_publish": false
  }
}
```

- [ ] **Step 6: Run GREEN and commit**

```bash
node --test tests/native-business-moderation-contract.test.mjs tests/business-presence-publication-contract.test.mjs
npm run check:launch

git add app/api/businesses/route.ts app/api/business-resumes/[id]/route.ts tests/native-business-moderation-contract.test.mjs tests/business-presence-publication-contract.test.mjs package.json
git commit -m "feat: require active presence for business publication"
```

---

## Task 6: Add owner-facing annual presence status and checkout entry point

**Files:**
- Create: `app/account-v2/businesses/[id]/BusinessPresenceCard.tsx`
- Create: `app/account-v2/businesses/[id]/BusinessPresenceCard.module.css`
- Modify: `app/account-v2/businesses/[id]/page.tsx`
- Modify: `app/account-v2/businesses/[id]/BusinessPanelSwitcher.tsx` if a dedicated tab is needed
- Create: `tests/business-presence-ui-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED UI contract**

Assert service/parts pages display current presence status, expiry, and a CTA to canonical checkout using `business_presence_12m` + `activity_id`. Assert dealer pages do not display the annual presence purchase card.

- [ ] **Step 2: Run RED**

```bash
node --test tests/business-presence-ui-contract.test.mjs
```

- [ ] **Step 3: Implement the card**

States:
- active: show expiry/renew action;
- expired but within grace: unpublished warning + renew action + media purge date;
- purge threshold reached: warn that images are eligible for permanent deletion;
- dealer: component returns `null`.

The checkout link must not contain a price; it contains service key/target only.

- [ ] **Step 4: Run GREEN and commit**

```bash
node --test tests/business-presence-ui-contract.test.mjs
npm run check:launch

git add app/account-v2/businesses/[id] tests/business-presence-ui-contract.test.mjs package.json
git commit -m "feat: show business presence lifecycle"
```

---

## Task 7: Create moderated business-content upload and asset APIs

**Files:**
- Create: `app/api/auth/business-content/[id]/upload/route.ts`
- Create: `app/api/auth/business-content/[id]/route.ts`
- Create: `lib/business-content.ts`
- Create: `tests/business-content-api-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED contracts for ownership, capacity and moderation**

Assert:
- both routes enforce authenticated owner activity access and cross-site protection for mutations;
- uploads allow JPG/PNG/WebP and preserve existing max request protection;
- newly registered assets are always `pending` regardless of client body;
- service item limit defaults to 20; parts card limit 50; hard caps are 100/200;
- capacity is based on active item/card count, not lifetime upload count;
- no capacity-upgrade checkout/product is introduced.

- [ ] **Step 2: Run RED**

```bash
node --test tests/business-content-api-contract.test.mjs
```

- [ ] **Step 3: Implement policy helpers in `lib/business-content.ts`**

```ts
export const BUSINESS_PROFILE_GALLERY_LIMIT = 6;
export const SERVICE_PORTFOLIO_BASE_LIMIT = 20;
export const SERVICE_PORTFOLIO_HARD_LIMIT = 100;
export const PARTS_CATALOG_BASE_LIMIT = 50;
export const PARTS_CATALOG_HARD_LIMIT = 200;

export function contentPolicy(activityType: string) {
  return activityType === "parts_store"
    ? { kind: "parts", base: 50, hard: 200 }
    : { kind: "portfolio", base: 20, hard: 100 };
}
```

Later Plan 4 may read these defaults from admin rules; this helper must accept an optional rules object so values are not permanently hardcoded in behavior.

- [ ] **Step 4: Implement upload registration**

Reuse the authenticated upstream upload mechanism, then insert a `business_content_assets` row with `review_status = "pending"`. Return `asset_id`, moderation state, and preview URL. If DB registration fails after remote upload, enqueue the URL for cleanup rather than publishing it.

- [ ] **Step 5: Implement structured CRUD with strict type rules**

Service portfolio POST examples:

```json
{
  "content_type": "portfolio",
  "item_type": "before_after",
  "title": "ترمیم سپر",
  "caption": "",
  "primary_asset_id": 31,
  "secondary_asset_id": 32
}
```

Parts card POST example:

```json
{
  "content_type": "part",
  "name": "چراغ جلو ۲۰۷",
  "brand": "...",
  "compatible_models": ["پژو ۲۰۷"],
  "availability": "available",
  "price_mode": "quote",
  "price_toman": null,
  "image_asset_id": 44
}
```

For `price_mode = "fixed"`, require safe integer `price_toman > 0`. For `contact` or `quote`, persist `price_toman = null`.

- [ ] **Step 6: Run GREEN and commit**

```bash
node --test tests/business-content-api-contract.test.mjs
npm run check:launch

git add app/api/auth/business-content lib/business-content.ts tests/business-content-api-contract.test.mjs package.json
git commit -m "feat: add moderated business content APIs"
```

---

## Task 8: Add admin one-time media moderation

**Files:**
- Create: `app/api/admin/business-content/route.ts`
- Modify: `app/admin/businesses/BusinessesAdminClient.tsx`
- Modify: `app/admin/businesses/page.module.css` or its existing CSS module
- Create: `tests/business-content-moderation-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED moderation tests**

Assert protected admin access, queue filters `review_status = pending`, and PATCH only accepts `approved` or `rejected` with reason required for rejection.

- [ ] **Step 2: Run RED**

```bash
node --test tests/business-content-moderation-contract.test.mjs
```

- [ ] **Step 3: Implement moderation route**

Persist `reviewed_by`, `reviewed_at`, `review_reason`. Never mutate an approved asset URL in place. Replacement is a new asset row and starts pending.

- [ ] **Step 4: Add moderation UI to the existing business admin screen**

Show preview, business name/type, asset kind, submitted timestamp, approve/reject. Keep current account-activity approval queue intact.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test tests/business-content-moderation-contract.test.mjs tests/native-business-moderation-contract.test.mjs
npm run check:launch

git add app/api/admin/business-content app/admin/businesses tests/business-content-moderation-contract.test.mjs package.json
git commit -m "feat: moderate business content assets"
```

---

## Task 9: Build owner portfolio and parts-catalog managers

**Files:**
- Create: `app/account-v2/businesses/[id]/BusinessContentManager.tsx`
- Create: `app/account-v2/businesses/[id]/BusinessContentManager.module.css`
- Modify: `app/account-v2/businesses/[id]/page.tsx`
- Create: `tests/business-content-ui-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED UI contracts**

For service-like activities, assert UI supports single portfolio and Before/After pair and displays `20` base capacity. For `parts_store`, assert UI uses part-card fields and all three price modes: `قیمت مشخص`, `تماس بگیرید`, `استعلام قیمت`.

- [ ] **Step 2: Run RED**

```bash
node --test tests/business-content-ui-contract.test.mjs
```

- [ ] **Step 3: Implement a type-discriminated manager**

Do not create two unrelated data clients. Share loading/error/capacity/moderation state; render a portfolio editor for service activities and part-card editor for parts stores.

Display moderation badges (`در انتظار تأیید`, `تأییدشده`, `ردشده`) and disable public/Story actions until approved.

- [ ] **Step 4: Run GREEN and commit**

```bash
node --test tests/business-content-ui-contract.test.mjs
npm run check:launch

git add app/account-v2/businesses/[id]/BusinessContentManager.tsx app/account-v2/businesses/[id]/BusinessContentManager.module.css app/account-v2/businesses/[id]/page.tsx tests/business-content-ui-contract.test.mjs package.json
git commit -m "feat: add portfolio and parts catalog manager"
```

---

## Task 10: Publish approved structured content on public business pages

**Files:**
- Modify: `app/api/businesses/route.ts`
- Modify: `app/businesses/[slug]/page.tsx`
- Modify: `app/businesses/activity/[id]/page.tsx` if native activity detail uses this route
- Modify: related CSS modules
- Create: `tests/public-business-content-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED public contracts**

Assert public API returns only active structured rows whose referenced assets are approved and not purged. Before/After requires both assets approved. Part cards may survive with textual data after image purge; image becomes null.

- [ ] **Step 2: Run RED**

```bash
node --test tests/public-business-content-contract.test.mjs tests/public-business-contract.test.mjs
```

- [ ] **Step 3: Add public read models**

Portfolio response contains `item_type`, approved image URLs, title/caption. Parts response contains structured product advertising data and optional approved image; no checkout/order URLs.

- [ ] **Step 4: Render the correct section by business type**

Service: “نمونه‌کارها” with Before/After pair cards. Parts: “قطعات و محصولات” advertising catalog. Do not label either as an ecommerce store.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test tests/public-business-content-contract.test.mjs tests/public-business-contract.test.mjs
npm run check:launch

git add app/api/businesses/route.ts app/businesses tests/public-business-content-contract.test.mjs package.json
git commit -m "feat: publish approved business content"
```

---

## Task 11: Implement six-month media-retention warnings and purge queue

**Files:**
- Create: `lib/business-media-retention.ts`
- Create: `lib/business-media-storage.ts`
- Create: `app/api/internal/business-media-retention/route.ts`
- Modify: `lib/runtime-env.ts`
- Modify: `app/account-v2/businesses/[id]/BusinessPresenceCard.tsx`
- Create: `tests/business-media-retention-contract.test.mjs`
- Modify: `package.json`
- Modify at deployment stage: Cloudflare Worker configuration for a daily scheduled invocation only after route authentication/worker scheduling pattern is verified against installed Vinext docs

- [ ] **Step 1: Add RED retention-state tests**

Test exact state transitions:

```ts
export type RetentionStage = "active" | "expired" | "purge_in_30_days" | "purge_in_7_days" | "purge_due";
```

Given `expiresAt`/`graceEndsAt`, verify warnings at expiry, <=30 days to grace end, <=7 days, and purge due. Renewal before purge removes items from eligibility.

- [ ] **Step 2: Run RED**

```bash
node --test tests/business-media-retention-contract.test.mjs
```

- [ ] **Step 3: Implement retention selection and queueing**

At `now >= graceEndsAt`, enqueue every unpurged heavy `business_content_assets` row for that activity. Immediately exclude queued/due assets from public read models so an overdue page cannot republish stale media merely because physical deletion is temporarily unavailable.

Do not delete textual portfolio/part records, finance data, or `business_activity_resumes` text.

- [ ] **Step 4: Implement an explicit storage deletion adapter**

`lib/business-media-storage.ts` must expose:

```ts
export type DeleteMediaResult = { deleted: true } | { deleted: false; retryable: boolean; reason: string };
export async function deleteBusinessMedia(storageUrl: string): Promise<DeleteMediaResult>;
```

Rules:
- Only allow URLs under Chakod-controlled upload origins/prefixes already accepted by media normalization.
- If the runtime has no configured authenticated deletion capability, return a non-success result and leave queue row retryable/failed; never mark the asset physically deleted.
- Do not invent an upstream endpoint. When the real storage backend exposes an authenticated delete API, configure it through runtime environment/secrets and add a smoke test before Production launch.
- Staging fixture URLs may use a staging-only adapter that records `staging_demo` deletion without touching real media; that behavior must be impossible on non-staging hosts.

- [ ] **Step 5: Process queue idempotently**

For each due row: call adapter; on success set queue `deleted`, set asset `purged_at`, clear/hide its `storage_url` from public serialization; on retryable failure increment attempts/last_error. Reruns must not delete twice.

- [ ] **Step 6: Surface warnings in owner UI**

The presence card must show the exact retention deadline and warning stage. This satisfies the required in-product warnings without adding SMS/email scope in v1.

- [ ] **Step 7: Run GREEN and commit**

```bash
node --test tests/business-media-retention-contract.test.mjs tests/public-business-content-contract.test.mjs
npm run check:launch

git add lib/business-media-retention.ts lib/business-media-storage.ts app/api/internal/business-media-retention lib/runtime-env.ts app/account-v2/businesses/[id]/BusinessPresenceCard.tsx tests/business-media-retention-contract.test.mjs package.json
git commit -m "feat: enforce business media retention"
```

- [ ] **Step 8: Add staging scheduled execution only after the route/worker scheduling contract is proven**

Read the installed Vinext/Cloudflare worker docs and current Worker entry before modifying scheduling. Add a daily schedule that invokes the same retention service directly, not an unauthenticated public HTTP endpoint. Run the dedicated schedule contract in staging.

Production release gate: do not launch real business subscriptions until a real physical-delete adapter is configured and a test upload can be deleted end-to-end with evidence.

---

## Task 12: Full verification and staging-only PR

**Files:**
- Modify at end: `AI_HANDOFF.md`

- [ ] **Step 1: Run all relevant verification**

```bash
npm run check:launch
npm run d1:verify
npm run build:cloudflare
npm run build:cpanel
```

- [ ] **Step 2: Update `AI_HANDOFF.md` with actual evidence and the media-delete release gate**

- [ ] **Step 3: Open a PR to `agent/launch-3-local-baseline`**

Keep this PR focused on annual business presence + structured business content + retention. Do not include Story runtime or Market Floor billing.

- [ ] **Step 4: After explicit owner merge approval, verify staging**

Use staging-only accounts to verify: annual presence purchase simulation; Dealer exemption; expiration gate; service portfolio; Before/After; parts price modes; one-time moderation; capacity limits; retention warning state. Never exercise real payment or real Production deletion.
