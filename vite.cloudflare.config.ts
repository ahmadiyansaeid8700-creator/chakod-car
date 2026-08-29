import vinext from "vinext";
import { defineConfig } from "vite";

/**
 * Standalone Cloudflare Workers build.
 *
 * This intentionally does not import the Site Creator injected files used by
 * vite.config.ts (`.openai/hosting.json` and `build/sites-vite-plugin`). It is
 * used by the dedicated staging Worker created in the Cloudflare dashboard.
 * The production/Sites build continues to use vite.config.ts unchanged.
 */
export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    define: {
      "process.env.NEXT_PUBLIC_PRELAUNCH_FIXTURES": JSON.stringify(
        process.env.NEXT_PUBLIC_PRELAUNCH_FIXTURES || "false",
      ),
      "process.env.PRELAUNCH_FIXTURES": JSON.stringify(
        process.env.PRELAUNCH_FIXTURES || "false",
      ),
    },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: {
          name: process.env.CLOUDFLARE_WORKER_NAME || "chakod-car-staging",
          main: "./worker/index.ts",
          compatibility_date: "2026-08-07",
          compatibility_flags: [
            "nodejs_compat",
            "nodejs_compat_populate_process_env",
          ],
          workers_dev: true,
          preview_urls: false,
          vars: {
            NEXT_PUBLIC_PRELAUNCH_FIXTURES: "true",
            PRELAUNCH_FIXTURES: "true",
          },
          routes: [
            {
              pattern: "staging.chakod.com",
              custom_domain: true,
            },
          ],
          assets: {
            binding: "ASSETS",
          },
          images: {
            binding: "IMAGES",
          },
          d1_databases: [
            {
              binding: "DB",
              database_name: "chakod-staging",
              database_id: "c38ca246-c71b-4a64-98fb-d0c946da3cb9",
            },
          ],
        },
      }),
    ],
  };
});
