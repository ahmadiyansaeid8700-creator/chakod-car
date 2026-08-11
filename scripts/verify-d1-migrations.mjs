import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = join(root, ".tmp-d1-verification");
const configPath = join(tempRoot, "wrangler.jsonc");
const persistPath = join(tempRoot, "state");
const databaseName = "chakod-launch-check";
const wrangler = join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "wrangler.cmd" : "wrangler",
);

const migrations = [
  "drizzle/0000_curvy_wildside.sql",
  "drizzle/0001_launch_finance_support.sql",
  "drizzle/0002_content_articles.sql",
  "drizzle/0003_business_verifications.sql",
  "drizzle/0004_account_activities.sql",
];

const expectedTables = [
  "banner_reservations",
  "wallets",
  "wallet_transactions",
  "commerce_orders",
  "payment_attempts",
  "invoices",
  "payment_refunds",
  "featured_showroom_placements",
  "support_tickets",
  "support_replies",
  "content_articles",
  "business_verification_requests",
  "account_activities",
];

function run(args) {
  const result = spawnSync(wrangler, args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      WRANGLER_WRITE_LOGS: "false",
      NO_COLOR: "1",
    },
  });

  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`wrangler ${args.join(" ")} failed${detail ? `\n${detail}` : ""}`);
  }

  return [result.stdout, result.stderr].filter(Boolean).join("\n");
}

rmSync(tempRoot, { recursive: true, force: true });
mkdirSync(tempRoot, { recursive: true });
writeFileSync(
  configPath,
  JSON.stringify(
    {
      name: "chakod-d1-migration-verification",
      compatibility_date: "2026-08-07",
      d1_databases: [
        {
          binding: "DB",
          database_name: databaseName,
          database_id: "00000000-0000-4000-8000-000000000000",
        },
      ],
    },
    null,
    2,
  ),
);

try {
  for (const migration of migrations) {
    readFileSync(join(root, migration), "utf8");
    run([
      "d1",
      "execute",
      databaseName,
      "--local",
      "--config",
      configPath,
      "--persist-to",
      persistPath,
      "--file",
      migration,
    ]);
  }

  const output = run([
    "d1",
    "execute",
    databaseName,
    "--local",
    "--config",
    configPath,
    "--persist-to",
    persistPath,
    "--command",
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;",
  ]);

  const missing = expectedTables.filter((table) => !output.includes(table));
  if (missing.length) {
    throw new Error(`D1 migration verification is missing tables: ${missing.join(", ")}`);
  }

  console.log(`D1 migrations verified successfully (${migrations.length} files, ${expectedTables.length} required tables).`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
