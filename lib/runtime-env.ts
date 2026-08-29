import { AsyncLocalStorage } from "node:async_hooks";

export type ChakodRuntimeEnv = {
  ASSETS: Fetcher;
  DB: D1Database;
  NEXT_PUBLIC_PRELAUNCH_FIXTURES?: string;
  PRELAUNCH_FIXTURES?: string;
  CHAKOD_ADMIN_EMAILS?: string;
  INSTAGRAM_PUBLISH_ENABLED?: string;
  INSTAGRAM_GRAPH_API_VERSION?: string;
  INSTAGRAM_BUSINESS_ACCOUNT_ID?: string;
  INSTAGRAM_ACCESS_TOKEN?: string;
  INSTAGRAM_PUBLISHER_SECRET?: string;
  INSTAGRAM_STORY_MIN_PRICE_TOMAN?: string;
  INSTAGRAM_STORY_DAILY_CAPACITY?: string;
  INSTAGRAM_STORY_MIN_INTERVAL_MINUTES?: string;
  INSTAGRAM_STORY_MAX_ATTEMPTS?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: {
          format: string;
          quality: number;
        }): Promise<{ response(): Response }>;
      };
    };
  };
};

type RuntimeGlobal = typeof globalThis & {
  __chakodRuntimeEnvStorage?: AsyncLocalStorage<ChakodRuntimeEnv>;
};

const runtimeGlobal = globalThis as RuntimeGlobal;
const envStorage =
  runtimeGlobal.__chakodRuntimeEnvStorage ??
  new AsyncLocalStorage<ChakodRuntimeEnv>();

runtimeGlobal.__chakodRuntimeEnvStorage = envStorage;

export function runWithRuntimeEnv<T>(
  env: ChakodRuntimeEnv,
  callback: () => T,
) {
  return envStorage.run(env, callback);
}

export function getRuntimeEnv() {
  const current = envStorage.getStore();
  if (!current) {
    throw new Error("Chakod runtime environment is unavailable.");
  }
  return current;
}
