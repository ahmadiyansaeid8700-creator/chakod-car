import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function readJson(path) {
  return JSON.parse(await read(path));
}

test("keeps numbered SQL migration deployment chain ordered and unique", async () => {
  const migrationFiles = (await readdir(new URL("../drizzle/", import.meta.url)))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();

  assert.equal(migrationFiles.at(-1), "0010_credit_ledger.sql");
  assert.equal(new Set(migrationFiles).size, migrationFiles.length);
  assert.deepEqual(
    migrationFiles.map((name) => Number(name.slice(0, 4))),
    migrationFiles.map((_, index) => index),
  );

  const verifier = await read("scripts/verify-d1-migrations.mjs");
  for (const migrationFile of migrationFiles) {
    assert.ok(
      verifier.includes(`drizzle/${migrationFile}`),
      `D1 verifier must apply ${migrationFile}`,
    );
  }
});

test("keeps Drizzle migration journal metadata ordered and unique", async () => {
  // _journal.json tracks the Drizzle-generated snapshot history only.
  // The deployment chain is the numbered SQL files above, applied by verify-d1-migrations.mjs.
  const journal = await readJson("drizzle/meta/_journal.json");
  const tags = journal.entries.map((entry) => entry.tag);
  const indexes = journal.entries.map((entry) => entry.idx);

  assert.deepEqual(indexes, indexes.map((_, index) => index));
  assert.equal(new Set(tags).size, tags.length);
  assert.ok(tags.every((tag) => /^\d{4}_.+/.test(tag)));
});

test("keeps finance and support tables in migration 0001", async () => {
  const sql = await read("drizzle/0001_launch_finance_support.sql");
  for (const table of [
    "wallets",
    "wallet_transactions",
    "commerce_orders",
    "payment_attempts",
    "invoices",
    "payment_refunds",
    "featured_showroom_placements",
    "support_tickets",
    "support_replies",
  ]) {
    assert.ok(sql.includes(`CREATE TABLE \`${table}\``), `migration 0001 must create ${table}`);
  }
  assert.match(sql, /order_no` text NOT NULL UNIQUE/);
  assert.match(sql, /idempotency_key` text NOT NULL UNIQUE/);
});

test("keeps CMS table in migration 0002", async () => {
  const sql = await read("drizzle/0002_content_articles.sql");
  assert.match(sql, /CREATE TABLE `content_articles`/);
  assert.match(sql, /`slug` text NOT NULL UNIQUE/);
  assert.match(sql, /`status` text DEFAULT 'draft' NOT NULL/);
});

test("keeps business verification table in migration 0003", async () => {
  const sql = await read("drizzle/0003_business_verifications.sql");
  assert.match(sql, /CREATE TABLE `business_verification_requests`/);
  assert.match(sql, /`activity_key` text NOT NULL/);
  assert.match(sql, /business_verification_requests_activity_key_unique/);
  assert.match(sql, /`document_base64` text NOT NULL/);
  assert.match(sql, /`status` text DEFAULT 'pending' NOT NULL/);
});

test("keeps generic account activities in migration 0004", async () => {
  const sql = await read("drizzle/0004_account_activities.sql");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `account_activities`/);
  assert.match(sql, /`owner_user_id` integer NOT NULL/);
  assert.match(sql, /`activity_type` text NOT NULL/);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS `account_activities_owner_type_unique`/);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS `account_activities_external_dealer_unique`/);
});

test("keeps migration snapshots chained", async () => {
  const snapshot1 = await readJson("drizzle/meta/0001_snapshot.json");
  const snapshot2 = await readJson("drizzle/meta/0002_snapshot.json");

  assert.equal(snapshot2.prevId, snapshot1.id);
  for (const table of [
    "wallets",
    "commerce_orders",
    "featured_showroom_placements",
    "support_tickets",
  ]) {
    assert.ok(snapshot1.tables?.[table], `snapshot 0001 must include ${table}`);
    assert.ok(snapshot2.tables?.[table], `snapshot 0002 must retain ${table}`);
  }
  assert.ok(snapshot2.tables?.content_articles, "snapshot 0002 must include content_articles");
});
