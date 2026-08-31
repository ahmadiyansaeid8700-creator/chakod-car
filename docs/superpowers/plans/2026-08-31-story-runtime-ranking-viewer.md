# Story Runtime, Ranking, and Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current order-backed one-off Story implementation with independent Story records that consume Story credits, support all approved Chakod-native source types, group frames by owner, rank local/unseen/affinity/freshness, and deliver the approved Instagram-like tray/viewer behavior.

**Architecture:** Story publication is a content transaction, not a Commerce purchase. `StorySourceResolver` validates ownership, source state, selected media, and business presence/moderation. A single D1 batch inserts the Story-credit debit and Story record using one idempotency key family. Public Story reads operate on Story tables, not `commerce_orders`. Ranking works at owner-group level and consumes compact viewer state (`seen` + aggregated owner affinity) rather than unbounded raw interaction history. UI is split into data/ranking adapters, tray, and viewer so `HomeStoriesUnified.tsx` does not continue growing as a monolith.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, Cloudflare D1/SQLite, CSS Modules, existing home-location model, existing optional Instagram publishing integration, Node contract tests.

**Spec:** `docs/superpowers/specs/2026-08-30-stories-revenue-credit-design.md`

## Dependencies

- `2026-08-31-credit-ledger-story-packs.md` completed: `story_credit` ledger/balance, pack checkout, paid fulfillment.
- `2026-08-31-business-presence-content.md` completed: business presence, approved portfolio/Before-After/part assets.
- `2026-08-31-revenue-rules-market-floor.md` admin-rule cleanup completed through its Story/business rule tasks so Story duration and Story enablement come from the canonical rule source rather than hardcoded checkout constants.

## Global Constraints

- Work from a fresh feature branch from the exact current staging SHA after dependencies merge.
- Existing `app/api/stories/checkout/route.ts` one-off coupon/order flow is retired. Do not adapt `STORY100` or `listing_story` into the new architecture.
- Story packages never affect ranking. `story_pack_100` must have no rank field or priority branch that `story_pack_25` lacks.
- Story source is Chakod-native only. No article source, arbitrary URL, free text, or generic media upload through Story creation.
- Normal Story = one image = one credit. Before/After pair = one logical frame with two approved assets = one credit.
- Business Story publication requires active annual presence; Dealer is exempt from annual presence.
- Source content that is not currently publishable must fail before credit debit.
- A successful owner deletion after publication does not refund credit.
- Optional Instagram distribution cannot make Chakod Story publication fail or roll back a committed Story.
- Staging fixtures stay staging-only. Stop direct dependence on legacy remote `home-stories.php` for the new local Story model; local fixtures remain available through the local public Story route when explicitly enabled.
- Tray visual order is intentionally LTR while Persian labels remain RTL: first visible tile on the left is `استوری شما`, then owner groups extend right.

---

## Task 1: Add independent Story and compact interaction tables

**Files:**
- Create: `drizzle/0013_story_runtime.sql` (use `0013` because Plan 4 owns `0012`; verify the actual current tail before implementation and use the next free additive number)
- Modify: `db/schema.ts`
- Modify: `tests/migration-chain-contract.test.mjs`
- Create: `tests/story-schema-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Verify the actual migration tail before naming the new file**

Run the migration contract and list `drizzle/`. If Plan 4 produced a different next number, use the next free numeric prefix and update this plan's filename references in the implementation branch before writing SQL. Never overwrite an applied migration.

- [ ] **Step 2: Add RED schema tests**

Assert creation of:

```text
stories
story_seen
story_owner_affinity
story_event_counters
```

`stories` must have a unique public reference and a unique publication idempotency key.

- [ ] **Step 3: Run RED**

```bash
node --test tests/migration-chain-contract.test.mjs tests/story-schema-contract.test.mjs
```

- [ ] **Step 4: Create the migration**

Required Story shape:

```sql
CREATE TABLE `stories` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `public_id` text NOT NULL UNIQUE,
  `publish_idempotency_key` text NOT NULL UNIQUE,
  `owner_key` text NOT NULL,
  `owner_public_key` text NOT NULL,
  `owner_scope` text NOT NULL,
  `owner_type` text NOT NULL,
  `owner_label` text NOT NULL,
  `source_type` text NOT NULL,
  `source_id` text NOT NULL,
  `target_url` text NOT NULL,
  `primary_asset_id` integer,
  `secondary_asset_id` integer,
  `media_url_snapshot` text DEFAULT '' NOT NULL,
  `secondary_media_url_snapshot` text DEFAULT '' NOT NULL,
  `snapshot_json` text DEFAULT '{}' NOT NULL,
  `province` text DEFAULT '' NOT NULL,
  `city` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `starts_at` text NOT NULL,
  `expires_at` text NOT NULL,
  `credit_ledger_id` integer,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX `stories_active_location_idx`
  ON `stories` (`status`, `expires_at`, `province`, `city`);
CREATE INDEX `stories_owner_active_idx`
  ON `stories` (`owner_key`, `status`, `expires_at`);

CREATE TABLE `story_seen` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `viewer_key` text NOT NULL,
  `story_id` integer NOT NULL,
  `seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `story_seen_viewer_story_unique`
  ON `story_seen` (`viewer_key`, `story_id`);

CREATE TABLE `story_owner_affinity` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `viewer_key` text NOT NULL,
  `owner_public_key` text NOT NULL,
  `score` integer DEFAULT 0 NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `story_owner_affinity_viewer_owner_unique`
  ON `story_owner_affinity` (`viewer_key`, `owner_public_key`);

CREATE TABLE `story_event_counters` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `story_id` integer NOT NULL,
  `event_type` text NOT NULL,
  `event_count` integer DEFAULT 0 NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `story_event_counters_story_event_unique`
  ON `story_event_counters` (`story_id`, `event_type`);
```

- [ ] **Step 5: Mirror tables in Drizzle, add test to `test:contracts`, run GREEN**

```bash
node --test tests/migration-chain-contract.test.mjs tests/story-schema-contract.test.mjs
npm run d1:verify
```

- [ ] **Step 6: Commit**

```bash
git add drizzle db/schema.ts tests/story-schema-contract.test.mjs tests/migration-chain-contract.test.mjs package.json
git commit -m "feat: add independent story runtime schema"
```

---

## Task 2: Define one normalized Story source contract

**Files:**
- Create: `lib/story-source.ts`
- Create: `lib/story-source-resolver.ts`
- Create: `tests/story-source-resolver-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED source-contract tests**

The resolver output must be one normalized object regardless of source:

```ts
export type StorySourceType = "listing" | "dealership" | "business" | "portfolio" | "part";

export type ResolvedStorySource = {
  sourceType: StorySourceType;
  sourceId: string;
  ownerKey: string;
  ownerScope: string;
  ownerType: "personal" | "dealer" | "business";
  ownerLabel: string;
  targetUrl: string;
  province: string;
  city: string;
  title: string;
  priceToman?: number | null;
  primaryAssetId?: number | null;
  secondaryAssetId?: number | null;
  primaryMediaUrl: string;
  secondaryMediaUrl?: string;
  snapshot: Record<string, unknown>;
};
```

Assert resolver rejects:
- non-owned listing/dealership/business;
- inactive listing;
- expired service/parts business presence;
- pending/rejected/purged business asset;
- Before/After item missing either approved asset;
- part card with no currently approved image;
- media ID/URL not belonging to selected listing/dealership/business source;
- `article` or unknown source types.

- [ ] **Step 2: Run RED**

```bash
node --test tests/story-source-resolver-contract.test.mjs
```

- [ ] **Step 3: Implement pure types and resolver branches**

Listing/dealership branches may call existing authenticated upstream APIs because those canonical records live outside local D1. Business/portfolio/part branches must use `accountActivities`, active presence policy, and locally moderated structured content.

The resolver accepts only source identity + selected approved media identity; it builds title/price/city/name snapshot itself. It never accepts free overlay text from the request body.

- [ ] **Step 4: Run GREEN and commit**

```bash
node --test tests/story-source-resolver-contract.test.mjs
npm run check:launch

git add lib/story-source.ts lib/story-source-resolver.ts tests/story-source-resolver-contract.test.mjs package.json
git commit -m "feat: normalize story source validation"
```

---

## Task 3: Publish Story atomically with one Story-credit debit

**Files:**
- Create: `app/api/stories/publish/route.ts`
- Create: `lib/story-public-id.ts`
- Create: `tests/story-publish-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED publication contracts**

Assert publication route:
- protects mutation with `rejectCrossSiteMutation`;
- requires authenticated finance scope;
- validates `source_type`, `source_id`, selected asset/media, and a request idempotency key;
- calls `resolveStorySource()` before any credit mutation;
- reads Story enablement/duration from canonical platform rules, defaulting to 24 hours only if the stored rule is absent;
- checks for an existing Story by `publish_idempotency_key` and returns it on retry;
- inserts one `creditLedger` consume row and one `stories` row in the same `db.batch()`;
- maps `insufficient_credit` to HTTP 402/409 with a clear `story_credit_required` code;
- contains no Commerce order creation and no Story price.

- [ ] **Step 2: Run RED**

```bash
node --test tests/story-publish-contract.test.mjs
```

- [ ] **Step 3: Implement stable public IDs**

Use `createPublicReference("STY")` or an equivalent collision-resistant server-generated text reference. Do not derive the public URL from Commerce order IDs.

- [ ] **Step 4: Implement publication transaction**

Request example:

```json
{
  "source_type": "listing",
  "source_id": "812",
  "media_id": "44",
  "idempotency_key": "story_publish_<uuid>"
}
```

Before/After and part-card publication only need the structured content item/card ID; the resolver supplies approved asset IDs.

Build debit:

```ts
const credit = creditMutationValues({
  ownerKey: source.ownerKey,
  assetCode: STORY_CREDIT_ASSET,
  quantity: 1,
  transactionType: "consume",
  referenceType: "story",
  referenceId: publicId,
  idempotencyKey: `${publishKey}:credit`,
  metadata: { source_type: source.sourceType, source_id: source.sourceId },
});
```

Insert debit + Story in one D1 batch. Store a sanitized server-generated snapshot. On batch failure there must be neither Story nor debit.

- [ ] **Step 5: Keep Instagram optional and after local commit**

If the source is eligible for the existing Instagram queue, call the queue sync only after the local Story transaction commits. Catch queue errors. Never issue a credit refund or Story rollback because Instagram is unavailable.

- [ ] **Step 6: Run GREEN and commit**

```bash
node --test tests/story-publish-contract.test.mjs tests/instagram-story-publishing-contract.test.mjs
npm run check:launch

git add app/api/stories/publish lib/story-public-id.ts tests/story-publish-contract.test.mjs package.json
git commit -m "feat: publish stories from story credits"
```

---

## Task 4: Replace order-backed active/public Story reads and retire checkout

**Files:**
- Rewrite: `app/api/stories/active/route.ts`
- Rewrite: `app/api/stories/public/route.ts`
- Modify/retire: `app/api/stories/checkout/route.ts`
- Create: `lib/story-serializer.ts`
- Create: `tests/story-read-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED read contracts**

Assert `active` and `public` routes query `stories`, not `commerceOrders` / `listing_story`. Assert the public serializer supports all five source types and Before/After secondary media.

Assert retired checkout route returns HTTP 410 with a migration message and contains none of:

```text
STORY_TRIAL_PRICE_TOMAN
STORY100
listing_story
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/story-read-contract.test.mjs
```

- [ ] **Step 3: Implement private active read**

Filter by current finance owner key, `status = active`, `expires_at > now`. Return multiple frames, not one-per-listing replacement behavior.

- [ ] **Step 4: Implement generic public serializer**

Example response frame:

```json
{
  "story_id": "STY-...",
  "source_type": "portfolio",
  "source_id": "91",
  "owner_key": "public-owner-hash",
  "owner_label": "مرکز خدمات ...",
  "title": "ترمیم سپر",
  "province": "تهران",
  "city": "تهران",
  "media_type": "before_after",
  "media_url": "...",
  "secondary_media_url": "...",
  "public_url": "/businesses/activity/12",
  "starts_at": "...",
  "expires_at": "..."
}
```

For business asset-backed Stories, resolve current approved/non-purged asset state. If a required asset was purged/rejected or the business presence is no longer active, omit/disable the Story. Listing/dealership source invalidation should use the source-status integration available in the current deployment; do not perform N upstream requests per homepage fetch.

- [ ] **Step 5: Preserve explicit staging fixtures only through local route**

When prelaunch fixtures are enabled, merge `PRELAUNCH_STORIES` in the local public route. Mark `staging_demo: true`. No fixture branch may run on Production hostname/config.

- [ ] **Step 6: Run GREEN and commit**

```bash
node --test tests/story-read-contract.test.mjs tests/prelaunch-fixtures-contract.test.mjs
npm run check:launch

git add app/api/stories/active/route.ts app/api/stories/public/route.ts app/api/stories/checkout/route.ts lib/story-serializer.ts tests/story-read-contract.test.mjs package.json
git commit -m "refactor: read stories from story runtime"
```

---

## Task 5: Add bounded viewer identity, seen state, aggregate metrics, and affinity

**Files:**
- Create: `lib/story-viewer.ts`
- Create: `app/api/stories/events/route.ts`
- Create: `tests/story-events-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED event-contract tests**

Allowed event names are exactly:

```ts
export const STORY_EVENTS = [
  "impression",
  "start",
  "completion",
  "next",
  "previous",
  "skip",
  "click",
] as const;
```

Assert:
- unknown events rejected;
- public Story existence checked;
- viewer key is a server hash of a random first-party opaque cookie, not IP/email/phone;
- `start` marks Story seen with `ON CONFLICT DO UPDATE/NOTHING`;
- all events increment one aggregate `story_event_counters` row;
- affinity increments only by a small documented weight map, e.g. start +1, completion +2, click +4; navigation events do not buy rank;
- no Story pack/product code is used.

- [ ] **Step 2: Run RED**

```bash
node --test tests/story-events-contract.test.mjs
```

- [ ] **Step 3: Implement viewer cookie helper**

Use an opaque random value such as `crypto.randomUUID()`, cookie name `chakod_story_viewer`, `HttpOnly`, `SameSite=Lax`, `Secure` outside localhost, one-year lifetime. Store only a SHA-256 derived viewer key in D1.

- [ ] **Step 4: Implement event upserts**

Use a single D1 batch for counter + seen + affinity changes required by the event. Cap affinity to a bounded integer (for example 0..1000) so repeated events cannot overflow or dominate freshness forever.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test tests/story-events-contract.test.mjs
npm run check:launch

git add lib/story-viewer.ts app/api/stories/events tests/story-events-contract.test.mjs package.json
git commit -m "feat: track story seen and affinity signals"
```

---

## Task 6: Implement deterministic owner-group ranking

**Files:**
- Create: `lib/story-ranking.ts`
- Create: `tests/story-ranking.test.mjs`
- Modify: `app/api/stories/public/route.ts`
- Modify: `package.json`

- [ ] **Step 1: Write RED unit tests with fixed timestamps**

Pure ranking input should include owner, frames, seen state, affinity, local match tier, and freshness. Required ordering:

```text
own group (when viewer owns it)
unseen local groups
seen local groups
unseen nationwide fallback
seen nationwide fallback
```

Within the same bucket: higher affinity first, then fresher owner group, then deterministic owner key tie-break. Within an owner group: oldest unseen frame first, then remaining chronological frames so a multi-frame sequence plays coherently.

Assert package names/credit balances cannot be passed as ranking signals.

- [ ] **Step 2: Run RED**

```bash
node --test tests/story-ranking.test.mjs
```

- [ ] **Step 3: Implement the pure ranker**

Keep scoring explicit and inspectable; do not create a fake opaque “Instagram score”. Example bucket tuple:

```ts
[
  group.isOwn ? 0 : 1,
  group.hasUnseen ? 0 : 1,
  group.locationTier,
  -group.affinityScore,
  -group.latestStartMs,
  group.ownerPublicKey,
]
```

Own group is still rendered through the special “استوری شما” tile rather than duplicated as a normal bubble.

- [ ] **Step 4: Apply ranker in the public route/read model**

The route may return `groups` directly in addition to flat `data` during migration. Keep a temporary flat field only until the home client moves in Task 7.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test tests/story-ranking.test.mjs tests/story-read-contract.test.mjs
npm run check:launch

git add lib/story-ranking.ts app/api/stories/public/route.ts tests/story-ranking.test.mjs package.json
git commit -m "feat: rank story owner groups"
```

---

## Task 7: Refactor the homepage Story experience into tray + viewer components

**Files:**
- Modify: `app/components/HomeStoriesUnified.tsx`
- Create: `app/components/StoryTray.tsx`
- Create: `app/components/StoryTray.module.css`
- Create: `app/components/StoryViewer.tsx`
- Create: `app/components/StoryViewer.module.css`
- Modify: `app/components/HomeStoriesUnified.module.css`
- Create: `tests/home-stories-viewer-contract.test.mjs`
- Modify: `tests/homepage-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED UI contracts**

Assert:
- tray container has explicit `direction: ltr` / `dir="ltr"`;
- first tile label is exactly `استوری شما`;
- Persian text inside bubbles/viewer uses RTL;
- no direct fetch to `https://api.chakod.com/api/home-stories.php` remains;
- local endpoint is the Story source;
- viewer media uses `object-fit: contain`, not `cover`;
- right interaction zone advances; left goes previous;
- hold/pointer-down pauses and release resumes;
- segmented progress exists;
- ArrowRight, ArrowLeft, Escape handlers exist;
- reduced-motion behavior disables/softens automatic animation timing;
- ARIA labels exist for next/previous/close.

- [ ] **Step 2: Run RED**

```bash
node --test tests/home-stories-viewer-contract.test.mjs tests/homepage-contract.test.mjs
```

- [ ] **Step 3: Simplify `HomeStoriesUnified` to orchestration**

It should load home location, request local Story groups, add nationwide fallback when a selected location has insufficient groups, and hold viewer open/close state. Move grouping/progress/navigation rendering out.

Deduplicate by `story_id`; preserve ranked local group order before appending fallback owner groups.

- [ ] **Step 4: Implement `StoryTray`**

Render `استوری شما` first at visual left. If authenticated and own active frames exist, opening it starts those frames; if no active own Story, link/open the Story creation flow. For guests, it leads to Login with a returnTo Story creation URL.

Seen/unseen ring state comes from server viewer state, not package level.

- [ ] **Step 5: Implement `StoryViewer`**

Stage is full-screen responsive with a centered 9:16 frame. Use a blurred/dark background layer if needed, but foreground media is always `contain`. Before/After is one frame with two media panels (top/bottom on portrait, responsive equivalent on narrow landscape).

Navigation rules:
- tap/click right zone: next frame; at owner end, next owner;
- tap/click left: previous;
- pointer/touch hold: pause; release/cancel: resume;
- segment completes then auto-advance;
- last frame closes;
- keyboard: Right/Left/Escape;
- track `start`, `completion`, navigation and target `click` through `/api/stories/events`.

- [ ] **Step 6: Run GREEN and commit**

```bash
node --test tests/home-stories-viewer-contract.test.mjs tests/homepage-contract.test.mjs
npm run check:launch

git add app/components/HomeStoriesUnified.tsx app/components/HomeStoriesUnified.module.css app/components/StoryTray.tsx app/components/StoryTray.module.css app/components/StoryViewer.tsx app/components/StoryViewer.module.css tests/home-stories-viewer-contract.test.mjs tests/homepage-contract.test.mjs package.json
git commit -m "feat: add ranked story tray and viewer"
```

---

## Task 8: Replace listing-only Story creation UI with approved source choices

**Files:**
- Modify: `app/account/stories/StoryListingSelectorClient.tsx`
- Modify: `app/account/stories/page.tsx`
- Modify: `app/account/stories/page.module.css`
- Modify: `app/account-v2/businesses/[id]/BusinessContentManager.tsx`
- Modify: `app/account-v2/businesses/[id]/page.tsx`
- Create: `tests/story-create-ui-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED UI contract**

Assert creation UI can submit:
- own vehicle listing + one existing image;
- Dealer page + existing approved Dealer/profile image;
- Dealer-owned listing + one image;
- active service/parts business page + existing approved intro image;
- approved portfolio single;
- approved Before/After pair;
- approved part card with image.

Assert there is no text-edit field and no arbitrary Story upload input.

- [ ] **Step 2: Run RED**

```bash
node --test tests/story-create-ui-contract.test.mjs
```

- [ ] **Step 3: Refactor client naming and request shape**

If `StoryListingSelectorClient` is no longer listing-only, rename it to `StorySourceSelectorClient.tsx` and update imports in the same commit. Submit to `/api/stories/publish` with a random publication idempotency key.

- [ ] **Step 4: Add contextual Story CTAs to business content**

Approved portfolio/Before-After/part cards get `استوری کن`. Pending/rejected assets do not. Expired business presence shows the preserved credit balance but CTA is disabled with renewal guidance.

- [ ] **Step 5: Show Story credit balance and pack CTA**

If balance is zero, do not offer single Story payment. Link to the three Story packs in Commerce.

- [ ] **Step 6: Run GREEN and commit**

```bash
node --test tests/story-create-ui-contract.test.mjs
npm run check:launch

git add app/account/stories app/account-v2/businesses/[id] tests/story-create-ui-contract.test.mjs package.json
git commit -m "feat: create stories from approved chakod content"
```

---

## Task 9: Generalize the public Story URL page

**Files:**
- Modify: `app/stories/[id]/page.tsx`
- Create: `app/stories/[id]/page.module.css`
- Modify: `lib/double-story-share.ts` only if generic share-card input needs source-neutral names
- Create: `tests/public-story-page-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add RED contracts**

Assert the page accepts non-numeric public IDs, uses `MobileBackButton`, renders `contain`, supports source-neutral CTA labels, and renders Before/After pair without assuming vehicle fields.

- [ ] **Step 2: Run RED**

```bash
node --test tests/public-story-page-contract.test.mjs
```

- [ ] **Step 3: Remove inline vehicle-only page assumptions**

Use `source_type` and snapshot fields to render:
- listing: price/vehicle/location + `مشاهده آگهی خودرو`;
- dealership: Dealer title/location + `مشاهده نمایشگاه`;
- business/portfolio: business/content title + `مشاهده کسب‌وکار`;
- part: part name/brand/price mode + `مشاهده فروشگاه`.

Do not add part checkout or order CTA.

- [ ] **Step 4: Convert media to full-visible behavior**

Foreground media must be `object-fit: contain`. Add a background blur/gradient layer separately rather than cropping the source.

- [ ] **Step 5: Run GREEN and commit**

```bash
node --test tests/public-story-page-contract.test.mjs tests/mobile-navigation-contract.test.mjs
npm run check:launch

git add app/stories/[id] lib/double-story-share.ts tests/public-story-page-contract.test.mjs package.json
git commit -m "feat: generalize public story pages"
```

---

## Task 10: Full verification, staging PR, and behavioral smoke

**Files:**
- Modify at end: `AI_HANDOFF.md`

- [ ] **Step 1: Run all verification**

```bash
npm run check:launch
npm run d1:verify
npm run build:cloudflare
npm run build:cpanel
```

- [ ] **Step 2: Update `AI_HANDOFF.md` with actual evidence**

Include exact Story tests, migration count, build results, branch/PR, deployment state, and open external-backend/source-invalidation limitations.

- [ ] **Step 3: Open PR to `agent/launch-3-local-baseline`**

Do not merge without explicit owner approval.

- [ ] **Step 4: After merge approval, verify staging end-to-end with demo accounts**

Verify at minimum:
- buy each pack in simulated staging; package size does not change rank;
- publish two different images from one listing and consume two credits;
- publish a Before/After pair and consume one credit;
- owner grouping into one bubble;
- local first then nationwide fallback;
- `استوری شما` on visual left;
- right/left/pause/progress/keyboard behavior;
- expired business cannot publish but still owns credits;
- public Story uses `contain`;
- Instagram queue failure does not undo Chakod Story;
- no real payment, Production data, DNS, or `chakod.com` change.
