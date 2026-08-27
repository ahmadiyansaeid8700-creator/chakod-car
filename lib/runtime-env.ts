import { AsyncLocalStorage } from "node:async_hooks";

export type ChakodRuntimeEnv = {
  ASSETS: Fetcher;
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
