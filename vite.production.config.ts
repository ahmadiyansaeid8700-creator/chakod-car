import vinext from "vinext";
import { defineConfig } from "vite";

function requiredProductionValue(name: string): string {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(
      `${name} is required for a production build. Production deployment remains blocked until the real Cloudflare value is supplied.`,
    );
  }
  return value;
}

/**
 * Production Cloudflare Worker build configuration.
 *
 * Safety properties:
 * - no staging fallback values are accepted for D1;
 * - prelaunch fixtures are always disabled;
 * - no production custom-domain trigger is declared here, so building or
 *   uploading a version cannot attach chakod.com by itself;
 * - the final domain cutover must be a separate, explicitly approved action.
 */
export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const databaseName = requiredProductionValue("CLOUDFLARE_PRODUCTION_D1_DATABASE_NAME");
  const databaseId = requiredProductionValue("CLOUDFLARE_PRODUCTION_D1_DATABASE_ID");
  const workerName = String(process.env.CLOUDFLARE_PRODUCTION_WORKER_NAME || "chakod-car").trim();

  if (!workerName) {
    throw new Error("CLOUDFLARE_PRODUCTION_WORKER_NAME cannot be empty.");
  }

  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    define: {
      "process.env.NEXT_PUBLIC_PRELAUNCH_FIXTURES": JSON.stringify("false"),
      "process.env.PRELAUNCH_FIXTURES": JSON.stringify("false"),
    },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: {
          name: workerName,
          main: "./worker/index.ts",
          compatibility_date: "2026-08-07",
          compatibility_flags: ["nodejs_compat"],
          workers_dev: false,
          preview_urls: false,
          assets: {
            binding: "ASSETS",
          },
          images: {
            binding: "IMAGES",
          },
          d1_databases: [
            {
              binding: "DB",
              database_name: databaseName,
              database_id: databaseId,
            },
          ],
        },
      }),
    ],
  };
});
