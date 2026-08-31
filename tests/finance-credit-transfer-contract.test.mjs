import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("keeps story credit reads separate from the Toman wallet", async () => {
  const route = await read("app/api/finance/credits/route.ts");
  const summary = await read("app/api/finance/summary/route.ts");

  assert.match(route, /getFinanceOwnerKey\(request\)/);
  assert.match(route, /creditBalances/);
  assert.match(route, /STORY_CREDIT_ASSET/);
  assert.match(route, /available_quantity/);
  assert.match(summary, /credit_balances/);
  assert.match(summary, /available_quantity/);
});

test("transfers credits atomically only between owned finance scopes", async () => {
  const route = await read("app/api/finance/credits/transfer/route.ts");

  assert.match(route, /rejectCrossSiteMutation\(request\)/);
  assert.match(route, /listOwnedFinanceAccounts\(request\)/);
  assert.match(route, /accounts\.find\(\(account\) => account\.scope === sourceScope\)/);
  assert.match(route, /accounts\.find\(\(account\) => account\.scope === destinationScope\)/);
  assert.match(route, /source\.scope === destination\.scope/);
  assert.match(route, /Number\.isSafeInteger\(quantity\)/);
  assert.match(route, /quantity <= 0/);
  assert.match(route, /assetCode !== STORY_CREDIT_ASSET/);
  assert.match(route, /creditTransferValues\(/);
  assert.match(route, /const \[debit, credit\] = creditTransferValues/);
  assert.match(route, /await db\.batch\(\[/);
  assert.match(route, /db\.insert\(creditLedger\)\.values\(debit\)/);
  assert.match(route, /db\.insert\(creditLedger\)\.values\(credit\)/);
  assert.match(route, /isInsufficientCreditError\(error\)/);
  assert.match(route, /409/);
  assert.doesNotMatch(route, /availableBalanceToman|available_balance_toman|walletTransactions|wallets/);
});

test("renders Story credits as units with their own transfer form", async () => {
  const client = await read("app/account/wallet/WalletClient.tsx");

  assert.match(client, /اعتبار استوری/);
  assert.match(client, /available_quantity/);
  assert.match(client, /\/api\/finance\/credits\/transfer/);
  assert.match(client, /quantity:/);
  assert.match(client, /story_credit/);
  assert.match(client, /تعداد اعتبار/);
  assert.match(client, /انتقال اعتبار/);
  assert.match(client, /\/api\/finance\/wallet\/transfer/);
  assert.match(client, /amount_toman:/);
});
