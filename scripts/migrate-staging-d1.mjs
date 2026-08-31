import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wrangler = join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "wrangler.cmd" : "wrangler",
);

const STAGING_BRANCH = "agent/launch-3-local-baseline";
const DATABASE_NAME = "chakod-staging";
const DATABASE_ID = "c38ca246-c71b-4a64-98fb-d0c946da3cb9";
const REMOTE_MIGRATION_FLOOR = 10;

const REMOTE_MIGRATIONS = [
  {
    file: "drizzle/0010_credit_ledger.sql",
    expectedObjects: [
      ["table", "credit_balances"],
      ["table", "credit_ledger"],
      ["trigger", "credit_ledger_prevent_negative"],
      ["trigger", "credit_ledger_apply_balance"],
    ],
  },
];

const LEGACY_BASELINE_TABLES = [
  "commerce_orders",
  "account_activities",
  "market_floor_wallets",
  "market_floor_entries",
];

function migrationNumber(file) {
  const match = /^(\d{4})_.+\.sql$/.exec(file);
  return match ? Number(match[1]) : -1;
}

function isAuthorizedRemoteMigrationRun() {
  const githubStagingDeploy =
    process.env.GITHUB_ACTIONS === "true"
    && process.env.GITHUB_REF_NAME === STAGING_BRANCH;
  const explicitOperatorOverride = process.env.CHAKOD_APPLY_STAGING_D1_MIGRATIONS === "1";
  return githubStagingDeploy || explicitOperatorOverride;
}

function run(args) {
  const result = spawnSync(wrangler, args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      WRANGLER_WRITE_LOGS: "false",
      NO_COLOR: "1",
      NO_D1_WARNING: "true",
    },
  });

  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`wrangler ${args.join(" ")} failed${detail ? `\n${detail}` : ""}`);
  }

  return [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
}

function runJson(args) {
  const output = run(args);
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`Expected Wrangler JSON output for: ${args.join(" ")}`);
  }
}

function collectScalarStrings(value, output = []) {
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectScalarStrings(item, output);
    return output;
  }
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) collectScalarStrings(child, output);
  }
  return output;
}

function collectNamedObjects(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectNamedObjects(item, output);
    return output;
  }
  if (value && typeof value === "object") {
    if (typeof value.name === "string" && typeof value.type === "string") {
      output.push({ name: value.name, type: value.type });
    }
    for (const child of Object.values(value)) collectNamedObjects(child, output);
  }
  return output;
}

function findNamedScalar(value, key) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNamedScalar(item, key);
      if (found) return found;
    }
    return "";
  }
  if (value && typeof value === "object") {
    if (typeof value[key] === "string" && value[key].trim()) return value[key].trim();
    for (const child of Object.values(value)) {
      const found = findNamedScalar(child, key);
      if (found) return found;
    }
  }
  return "";
}

function assertTargetDatabase() {
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error("Cloudflare credentials are required before any remote staging D1 migration.");
  }

  const info = runJson(["d1", "info", DATABASE_NAME, "--json"]);
  const values = new Set(collectScalarStrings(info));
  if (!values.has(DATABASE_ID) || !values.has(DATABASE_NAME)) {
    throw new Error(
      `Remote D1 target mismatch. Expected ${DATABASE_NAME} (${DATABASE_ID}); migration aborted.`,
    );
  }
}

function readRemoteObjects() {
  const payload = runJson([
    "d1",
    "execute",
    DATABASE_NAME,
    "--remote",
    "--json",
    "--command",
    "SELECT type, name FROM sqlite_master WHERE type IN ('table','trigger') ORDER BY type, name;",
  ]);
  return collectNamedObjects(payload);
}

function assertLegacyBaseline(objects) {
  const tableNames = new Set(
    objects.filter((item) => item.type === "table").map((item) => item.name),
  );
  const missing = LEGACY_BASELINE_TABLES.filter((name) => !tableNames.has(name));
  if (missing.length) {
    throw new Error(
      `Remote staging D1 is older than the approved pre-0010 baseline; missing: ${missing.join(", ")}. Migration aborted.`,
    );
  }
}

function assertMigrationAllowlist() {
  const drizzleDir = join(root, "drizzle");
  const numbered = readdirSync(drizzleDir)
    .filter((file) => /^\d{4}_.+\.sql$/.test(file))
    .sort();
  const remoteFiles = numbered
    .filter((file) => migrationNumber(file) >= REMOTE_MIGRATION_FLOOR)
    .map((file) => `drizzle/${file}`);
  const allowed = new Set(REMOTE_MIGRATIONS.map((item) => item.file));
  const unlisted = remoteFiles.filter((file) => !allowed.has(file));

  if (unlisted.length) {
    throw new Error(
      `Unlisted remote migration(s) detected: ${unlisted.join(", ")}. Add an explicit fail-closed gate before deployment.`,
    );
  }

  for (const migration of REMOTE_MIGRATIONS) {
    if (!existsSync(join(root, migration.file))) {
      throw new Error(`Allowlisted remote migration file is missing: ${migration.file}`);
    }
  }
}

function captureRecoveryBookmark(migrationFile) {
  const info = runJson(["d1", "time-travel", "info", DATABASE_NAME, "--json"]);
  const bookmark = findNamedScalar(info, "bookmark");
  console.log(
    bookmark
      ? `Recovery bookmark before ${migrationFile}: ${bookmark}`
      : `Cloudflare Time Travel recovery point checked before ${migrationFile}.`,
  );
}

function applyMigration(migration, objects) {
  const expectedKeys = migration.expectedObjects.map(([type, name]) => `${type}:${name}`);
  const presentKeys = new Set(objects.map((item) => `${item.type}:${item.name}`));
  const present = expectedKeys.filter((key) => presentKeys.has(key));

  if (present.length === expectedKeys.length) {
    console.log(`${migration.file} is already present on remote staging D1; skipping safely.`);
    return readRemoteObjects();
  }

  if (present.length > 0) {
    throw new Error(
      `Partial remote schema detected for ${migration.file}: ${present.join(", ")}. Refusing to guess or reapply migration.`,
    );
  }

  captureRecoveryBookmark(migration.file);
  run([
    "d1",
    "execute",
    DATABASE_NAME,
    "--remote",
    "--yes",
    "--file",
    migration.file,
  ]);

  const after = readRemoteObjects();
  const afterKeys = new Set(after.map((item) => `${item.type}:${item.name}`));
  const missing = expectedKeys.filter((key) => !afterKeys.has(key));
  if (missing.length) {
    throw new Error(
      `Remote migration ${migration.file} finished without all required objects: ${missing.join(", ")}.`,
    );
  }

  console.log(`${migration.file} applied and verified on ${DATABASE_NAME}.`);
  return after;
}

function assertQuickCheck() {
  const payload = runJson([
    "d1",
    "execute",
    DATABASE_NAME,
    "--remote",
    "--json",
    "--command",
    "PRAGMA quick_check;",
  ]);
  const values = collectScalarStrings(payload).map((value) => value.toLowerCase());
  if (!values.includes("ok")) {
    throw new Error("Remote staging D1 PRAGMA quick_check did not return ok; deployment must stop.");
  }
}

if (!isAuthorizedRemoteMigrationRun()) {
  console.log(
    "Remote staging D1 migration skipped outside the authorized staging GitHub deployment. "
      + "Set CHAKOD_APPLY_STAGING_D1_MIGRATIONS=1 only for an intentional operator run.",
  );
  process.exit(0);
}

assertMigrationAllowlist();
assertTargetDatabase();
let objects = readRemoteObjects();
assertLegacyBaseline(objects);
for (const migration of REMOTE_MIGRATIONS) {
  objects = applyMigration(migration, objects);
}
assertQuickCheck();
console.log("Remote staging D1 migration gate passed.");
