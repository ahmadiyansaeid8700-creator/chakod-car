import type {
  ChakodAiManagerStatus,
  ChakodAiProvider,
} from "./contracts";

type EnvLike = Record<string, string | undefined>;

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

export function normalizeAiProvider(value: string | undefined): ChakodAiProvider {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "openai" || normalized === "local") {
    return normalized;
  }

  return "disabled";
}

export function readBooleanFlag(value: string | undefined) {
  return TRUE_VALUES.has(value?.trim().toLowerCase() || "");
}

export function getChakodAiManagerStatus(
  env: EnvLike = process.env,
): ChakodAiManagerStatus {
  const requestedEnabled = readBooleanFlag(env.CHAKOD_AI_MANAGER_ENABLED);
  const provider = normalizeAiProvider(env.CHAKOD_AI_MANAGER_PROVIDER);
  const providerConfigured = isProviderConfigured(provider, env);

  return {
    version: "0.1",
    requestedEnabled,
    ready: requestedEnabled && providerConfigured,
    provider,
    providerConfigured,
    mode: "read_suggest",
    writeActionsAllowed: false,
    listingModeration: {
      preserved: true,
      configured: Boolean(
        env.OPENAI_API_KEY?.trim() && env.CHAKOD_AI_WEBHOOK_SECRET?.trim(),
      ),
    },
  };
}

function isProviderConfigured(provider: ChakodAiProvider, env: EnvLike) {
  if (provider === "openai") {
    return Boolean(env.OPENAI_API_KEY?.trim());
  }

  if (provider === "local") {
    return Boolean(env.CHAKOD_AI_LOCAL_ENDPOINT?.trim());
  }

  return false;
}
