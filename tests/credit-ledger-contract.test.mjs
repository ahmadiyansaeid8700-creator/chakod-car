import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
