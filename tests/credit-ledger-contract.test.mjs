import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("defines typed credit balances and append-only ledger storage", async () => {
  const migration = await read("drizzle/0010_credit_ledger.sql");
  const schema = await read("db/schema.ts");

  assert.match(migration, /CREATE TABLE `credit_balances`/);
  assert.match(migration, /CREATE UNIQUE INDEX `credit_balances_owner_asset_unique`/);
  assert.match(migration, /CREATE TABLE `credit_ledger`/);
  assert.match(migration, /`idempotency_key` text NOT NULL UNIQUE/);
  assert.match(migration, /CHECK \(`quantity_delta` <> 0\)/);
  assert.match(migration, /RAISE\(ABORT, 'insufficient_credit'\)/);
  assert.match(migration, /AFTER INSERT ON `?credit_ledger`?/);
  assert.match(migration, /available_quantity = credit_balances\.available_quantity \+ NEW\.quantity_delta/);
  assert.doesNotMatch(migration, /expires_at/i);

  assert.match(schema, /export const creditBalances\s*=\s*sqliteTable/);
  assert.match(schema, /export const creditLedger\s*=\s*sqliteTable/);
  assert.match(schema, /uniqueIndex\("credit_balances_owner_asset_unique"\)/);
  assert.match(schema, /index\("credit_ledger_owner_asset_idx"\)/);
  assert.doesNotMatch(schema, /credit(?:Balances|Ledger)[\s\S]{0,800}expiresAt/);
});

test("keeps credit quantities out of the Toman wallet schema", async () => {
  const schema = await read("db/schema.ts");

  const walletStart = schema.indexOf("export const wallets");
  const walletEnd = schema.indexOf("export const walletTransactions");
  const walletBlock = schema.slice(walletStart, walletEnd);

  assert.ok(walletStart >= 0 && walletEnd > walletStart, "wallet schema block must exist");
  assert.doesNotMatch(walletBlock, /credit|quantity/i);
  assert.match(walletBlock, /availableBalanceToman/);
});

test("keeps negative idempotent replays harmless after the original debit spent the balance", async () => {
  const migration = await read("drizzle/0010_credit_ledger.sql");
  const db = new DatabaseSync(":memory:");
  db.exec(migration);

  const insert = db.prepare(`
    INSERT INTO credit_ledger (
      owner_key,
      asset_code,
      quantity_delta,
      transaction_type,
      reference_type,
      reference_id,
      idempotency_key,
      metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, '{}')
    ON CONFLICT(idempotency_key) DO NOTHING
  `);
  const balance = db.prepare(`
    SELECT available_quantity AS quantity
    FROM credit_balances
    WHERE owner_key = ? AND asset_code = ?
  `);

  insert.run("owner:a", "story_credit", 5, "purchase", "order", "order-1", "purchase-1");
  insert.run("owner:a", "story_credit", -5, "transfer_out", "transfer", "transfer-1", "transfer-1:out");
  assert.equal(balance.get("owner:a", "story_credit").quantity, 0);

  assert.doesNotThrow(() => {
    insert.run("owner:a", "story_credit", -5, "transfer_out", "transfer", "transfer-1", "transfer-1:out");
  });
  assert.equal(balance.get("owner:a", "story_credit").quantity, 0);

  assert.throws(
    () => insert.run("owner:a", "story_credit", -1, "consume", "story", "story-2", "consume-2"),
    /insufficient_credit/,
  );

  db.close();
});
