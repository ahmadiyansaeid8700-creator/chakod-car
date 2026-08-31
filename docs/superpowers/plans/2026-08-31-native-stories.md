# Native Stories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace order-coupled staging Stories with independent native Story records, credit-backed publishing, owner-grouped local-first ranking, and an Instagram-like left-origin tray/full-screen viewer.

**Architecture:** Story publication consumes `story_credit` through `lib/credit-ledger.ts` from the credit-foundation plan, then writes an independent Story row referencing an approved Chakod-native source. Read APIs return owner-grouped frames and ranking metadata; the UI never infers finance state from `commerce_orders`. Instagram distribution remains an optional downstream adapter and cannot determine native Story success.

**Tech Stack:** Next 16 / React 19, TypeScript, Drizzle/SQLite-D1, CSS Modules, Node contract tests.

**Spec:** `docs/superpowers/specs/2026-08-30-stories-revenue-credit-design.md`

## Global Constraints

- One successful Story frame consumes exactly one `story_credit`; Before/After business pairs are handled in the business plan as one logical frame.
- Story lifetime defaults to 24 hours from admin rules.
- Story sources are Chakod-native only; no arbitrary free upload or free text in vehicle/dealer Story creation.
- A dealer may Story its dealer page or any owned active vehicle listing; a personal user may Story an owned active listing.
- Multiple active Stories from one identity render under one owner ring.
- Tray starts visually from the left; first item is `استوری شما`.
- Viewer: right=next, left=previous, hold=pause, progress segments, auto-advance, Escape close, full-media `contain`.
- Organic ranking is local-first and pack-size-neutral.
- No production or `main` changes in this plan.

---

### Task 1: Add independent Story persistence and seen events

**Files:**
- Modify: `db/schema.ts`
- Create: `drizzle/0011_native_stories.sql`
- Create: `tests/native-story-schema-contract.test.mjs`
- Modify: `tests/migration-chain-contract.test.mjs`

**Interfaces:**
- Produces `stories` table with `ownerKey`, `ownerScope`, `ownerType`, `sourceType`, `sourceId`, `mediaJson`, `snapshotJson`, `province`, `city`, `startsAt`, `expiresAt`, `status`, `creditTransactionId`, timestamps.
- Produces `storyViews` table with `(story_id, viewer_key)` unique seen-state record plus `startedAt`, `completedAt`, `lastEvent`.

- [ ] **Step 1: Write failing schema contract**

```js
test("native stories are independent from commerce orders", () => {
  const schema = fs.readFileSync("db/schema.ts", "utf8");
  assert.match(schema, /export const stories = sqliteTable/);
  assert.match(schema, /export const storyViews = sqliteTable/);
  assert.match(schema, /creditTransactionId/);
  assert.match(schema, /sourceType/);
});
```

- [ ] **Step 2: Run and prove RED**

Run: `node --test tests/native-story-schema-contract.test.mjs`
Expected: FAIL because native Story tables do not exist.

- [ ] **Step 3: Add schema and migration**

Use `sourceType` values `listing`, `dealership`, `business`, `portfolio`, `part`. Store media as JSON so a normal frame can carry one approved asset and Before/After can carry two approved asset references without adding a second Story row.

- [ ] **Step 4: Verify migration chain**

Run: `node --test tests/native-story-schema-contract.test.mjs tests/migration-chain-contract.test.mjs && npm run d1:verify`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts drizzle/0011_native_stories.sql tests/native-story-schema-contract.test.mjs tests/migration-chain-contract.test.mjs
git commit -m "feat: add native story persistence"
```

### Task 2: Build Story source validation and publishing service

**Files:**
- Create: `lib/story-source.ts`
- Create: `lib/story-core.ts`
- Create: `tests/story-publish-contract.test.mjs`

**Interfaces:**
- Produces `type StorySourceType = "listing" | "dealership" | "business" | "portfolio" | "part"`.
- Produces `resolveStorySource(request, input): Promise<ResolvedStorySource>`.
- Produces `publishStory(input): Promise<{ storyId: number; publicStoryId: number; expiresAt: string; reused: boolean }>`.
- Consumes `consumeCredits({ assetCode: "story_credit", ... })`.

- [ ] **Step 1: Write failing publishing contracts**

Test source membership/ownership, active-public state, image membership, one-credit debit, idempotency, and `expiresAt = startsAt + configured duration`.

- [ ] **Step 2: Run and prove RED**

Run: `node --test tests/story-publish-contract.test.mjs`
Expected: FAIL because Story core modules do not exist.

- [ ] **Step 3: Implement source resolvers and atomic publish flow**

Define the resolved shape explicitly:

```ts
export type ResolvedStorySource = {
  sourceType: StorySourceType;
  sourceId: number;
  ownerKey: string;
  ownerScope: string;
  ownerType: "personal" | "dealer" | "business";
  ownerDisplayName: string;
  province: string;
  city: string;
  allowedMedia: Array<{ id: string; url: string }>;
  snapshot: Record<string, string | number | null>;
  publicPath: string;
};
```

For listings, reuse the existing authenticated listing-manage/public-ready checks currently embedded in `app/api/stories/checkout/route.ts`; move them into `lib/story-source.ts` instead of copying them into the new route. Publish must fail before debit if the source is inactive, no longer owned, or selected media is not in `allowedMedia`.

- [ ] **Step 4: Run focused test and TypeScript**

Run: `node --test tests/story-publish-contract.test.mjs && npx tsc --noEmit -p tsconfig.launch.json`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/story-source.ts lib/story-core.ts tests/story-publish-contract.test.mjs
git commit -m "feat: publish credit-backed native stories"
```

### Task 3: Replace Story checkout with source preview and publish APIs

**Files:**
- Modify: `app/api/stories/checkout/route.ts`
- Modify: `app/api/stories/active/route.ts`
- Create: `app/api/stories/publish/route.ts`
- Modify: `app/api/stories/public/[id]/route.ts`
- Create: `tests/native-story-api-contract.test.mjs`

**Interfaces:**
- `GET /api/stories/checkout?source_type=listing&source_id=123` returns source preview, allowed media, `story_credit` balance, duration; no trial price/coupon.
- `POST /api/stories/publish` accepts `{ source_type, source_id, media_ids, idempotency_key }` and returns the native Story id/path.
- `GET /api/stories/active` reads `stories`, not paid `commerceOrders`.

- [ ] **Step 1: Write failing route contract**

Assert absence of `STORY_TRIAL_PRICE_TOMAN`, `STORY_TEST_COUPON`, and `productCode = listing_story` from active/publish paths; assert `/publish` calls `publishStory` and active route filters `status=active` plus `expiresAt > now`.

- [ ] **Step 2: Run and prove RED**

Run: `node --test tests/native-story-api-contract.test.mjs`
Expected: FAIL against current order-coupled Story routes.

- [ ] **Step 3: Rewire routes to native Story service**

Keep `/checkout` temporarily as a compatibility preview endpoint for the existing account UI, but remove payment/coupon semantics. A POST to old `/checkout` should return HTTP 409 with code `story_publish_endpoint_moved` and the app must use `/api/stories/publish` for new writes.

- [ ] **Step 4: Run Story API and Instagram adapter contracts**

Run: `node --test tests/native-story-api-contract.test.mjs tests/instagram-story-publishing-contract.test.mjs && npx tsc --noEmit -p tsconfig.launch.json`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/stories tests/native-story-api-contract.test.mjs
git commit -m "refactor: decouple stories from commerce orders"
```

### Task 4: Preserve optional Instagram distribution as a post-publish adapter

**Files:**
- Modify: `lib/instagram-story-publishing.ts`
- Modify: `app/api/stories/instagram/status/route.ts`
- Modify: `tests/instagram-story-publishing-contract.test.mjs`

**Interfaces:**
- Instagram queue consumes native `storyId`, owner/source metadata, media URL, public Story URL, and source expiry.
- Native Story publication remains successful if Instagram enqueue/sync throws.

- [ ] **Step 1: Write failing adapter regression test**

Assert no Instagram queue code reads Story state from `commerce_orders.product_code = listing_story`; assert adapter input uses native Story id.

- [ ] **Step 2: Run and prove RED**

Run: `node --test tests/instagram-story-publishing-contract.test.mjs`
Expected: FAIL until adapter is detached from the legacy order id contract.

- [ ] **Step 3: Change adapter to native Story identifiers**

Keep existing capacity/status behavior. In `publishStory`, enqueue after the native Story row and credit debit are committed, inside a guarded `try/catch`; never roll back native Story on optional Instagram failure.

- [ ] **Step 4: Run adapter and Story publish contracts**

Run: `node --test tests/instagram-story-publishing-contract.test.mjs tests/story-publish-contract.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/instagram-story-publishing.ts app/api/stories/instagram/status/route.ts tests/instagram-story-publishing-contract.test.mjs
git commit -m "refactor: publish instagram from native stories"
```

### Task 5: Implement owner-grouped local-first ranking feed

**Files:**
- Create: `lib/story-ranking.ts`
- Create: `app/api/stories/feed/route.ts`
- Create: `tests/story-ranking.test.mjs`

**Interfaces:**
- Produces `rankStoryGroups(input): RankedStoryGroup[]`.
- Feed shape: `{ owner_key, owner_scope, owner_name, owner_type, seen, frames: StoryFrame[] }`.
- Sorting key is visibility class then location class then affinity score then freshness; package/product code is absent.

- [ ] **Step 1: Write deterministic ranking tests**

Use fixed fixtures to prove: unseen local > seen local > unseen nationwide fallback only after local inventory; higher affinity breaks ties before freshness; two frames from one owner produce one group; package size is not an input.

- [ ] **Step 2: Run and prove RED**

Run: `node --test tests/story-ranking.test.mjs`
Expected: FAIL because ranking module does not exist.

- [ ] **Step 3: Implement pure ranking first, then feed route**

Keep ranking pure and deterministic. Suggested score tuple:

```ts
[typeRank, locationRank, seenRank, affinityRank, freshnessRank]
```

Do not use a paid/product field. Within an owner group, order unseen frames by `startsAt` ascending so a sequence plays coherently; append already-seen frames after unseen frames.

- [ ] **Step 4: Run ranking tests and TypeScript**

Run: `node --test tests/story-ranking.test.mjs && npx tsc --noEmit -p tsconfig.launch.json`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/story-ranking.ts app/api/stories/feed/route.ts tests/story-ranking.test.mjs
git commit -m "feat: rank local owner-grouped stories"
```

### Task 6: Add seen/analytics event endpoint

**Files:**
- Create: `app/api/stories/events/route.ts`
- Create: `tests/story-events-contract.test.mjs`

**Interfaces:**
- Accepts events `impression`, `start`, `completion`, `next`, `previous`, `skip`, `target_click`.
- Upserts `storyViews` for seen state; event payload cannot mutate Story content or credits.

- [ ] **Step 1: Write failing endpoint contract**
- [ ] **Step 2: Run `node --test tests/story-events-contract.test.mjs` and prove RED**
- [ ] **Step 3: Implement strict event allowlist, Story existence validation, and idempotent view-state upsert**
- [ ] **Step 4: Run `node --test tests/story-events-contract.test.mjs tests/story-ranking.test.mjs` and expect PASS**
- [ ] **Step 5: Commit with `git commit -m "feat: track native story viewing events"`**

### Task 7: Rebuild account Story creation around media selection and credits

**Files:**
- Modify: `app/account/stories/StoryListingSelectorClient.tsx`
- Modify: `app/account/stories/page.module.css`
- Create: `app/account/stories/StoryMediaPicker.tsx`
- Create: `tests/account-story-creation-contract.test.mjs`

**Interfaces:**
- User selects source, then an allowed source image; each selected image publishes one frame/credit.
- UI shows current `story_credit` balance and pack-purchase link when insufficient.

- [ ] **Step 1: Write failing account-flow contract**

Assert there is no `STORY100` coupon input/copy and no per-Story Toman price; assert media picker posts one `/api/stories/publish` request per selected image with a unique idempotency key.

- [ ] **Step 2: Run and prove RED**

Run: `node --test tests/account-story-creation-contract.test.mjs`
Expected: FAIL against current coupon/checkout flow.

- [ ] **Step 3: Split media picker from the existing 26KB selector**

Keep source/account loading in `StoryListingSelectorClient.tsx`; move media-grid selection/publish controls to `StoryMediaPicker.tsx` so dealer/business target support can extend it without making one monolithic component.

- [ ] **Step 4: Run account/story contracts and TypeScript**

Run: `node --test tests/account-story-creation-contract.test.mjs tests/native-story-api-contract.test.mjs && npx tsc --noEmit -p tsconfig.launch.json`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/account/stories tests/account-story-creation-contract.test.mjs
git commit -m "feat: create stories from approved source media"
```

### Task 8: Add left-origin Story tray and full-screen grouped Viewer

**Files:**
- Create: `app/components/StoryTray.tsx`
- Create: `app/components/StoryViewer.tsx`
- Create: `app/components/story.module.css`
- Modify: homepage component that currently owns the top content rail; verify exact import site before edit and keep the Story components isolated
- Modify: `tests/homepage-contract.test.mjs`
- Create: `tests/story-viewer-contract.test.mjs`

**Interfaces:**
- `StoryTray` consumes feed groups plus current-owner state.
- `StoryViewer` consumes ordered owner groups and opens at `{ ownerIndex, frameIndex }`.

- [ ] **Step 1: Write failing viewer/tray contracts**

Assert CSS uses an LTR rail/order for groups while labels remain RTL; first rendered control is `استوری شما`; Viewer has 9:16 stage, `object-fit: contain`, left/right navigation zones, progress segments, pause pointer handlers, ArrowLeft/ArrowRight/Escape keyboard handlers, accessible close label, and reduced-motion rule.

- [ ] **Step 2: Run and prove RED**

Run: `node --test tests/story-viewer-contract.test.mjs tests/homepage-contract.test.mjs`
Expected: FAIL because native tray/viewer are absent.

- [ ] **Step 3: Implement isolated tray/viewer components and mount them on homepage**

Do not duplicate ranking in React; consume `/api/stories/feed`. When the last frame in a group completes, advance to the next owner group. When the final group completes, close Viewer.

- [ ] **Step 4: Run homepage/viewer/mobile contracts and TypeScript**

Run: `node --test tests/story-viewer-contract.test.mjs tests/homepage-contract.test.mjs tests/mobile-navigation-contract.test.mjs && npx tsc --noEmit -p tsconfig.launch.json`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components tests/story-viewer-contract.test.mjs tests/homepage-contract.test.mjs
git commit -m "feat: add grouped instagram-style story viewer"
```

## Plan Verification Gate

Run: `npm run test:contracts && npm run d1:verify && npm run check:launch`
Expected: all PASS, and staging smoke confirms a Story can be published with one credit, appears under one owner ring, expires after the configured duration, and does not depend on a `listing_story` Commerce order.
