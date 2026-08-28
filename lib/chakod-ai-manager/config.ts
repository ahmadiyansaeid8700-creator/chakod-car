import type {
  ChakodAiManagerStatus,
  ChakodAiProvider,
} from "./contracts";

export type ChakodAiEnv = Record<string, string | undefined>;

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DEFAULT_TIMEOUT_MS = 12_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_OPENAI_MODEL = "gpt-5.4";

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

export function normalizeLocalEndpoint(value: string | undefined) {
  const raw = value?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();

    if (!LOOPBACK_HOSTS.has(hostname)) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;

    return url.toString();
  } catch {
    return null;
  }
}

export function getChakodAiTimeoutMs(env: ChakodAiEnv = process.env) {
  const parsed = Number(env.CHAKOD_AI_MANAGER_TIMEOUT_MS);

  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS;

  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.trunc(parsed)));
}

export function getChakodAiOpenAiModel(env: ChakodAiEnv = process.env) {
  return env.CHAKOD_AI_MANAGER_OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export function getChakodAiManagerStatus(
  env: ChakodAiEnv = process.env,
): ChakodAiManagerStatus {
  const requestedEnabled = readBooleanFlag(env.CHAKOD_AI_MANAGER_ENABLED);
  const provider = normalizeAiProvider(env.CHAKOD_AI_MANAGER_PROVIDER);
  const providerConfigured = isProviderConfigured(provider, env);

  return {
    version: "0.2",
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

function isProviderConfigured(provider: ChakodAiProvider, env: ChakodAiEnv) {
  if (provider === "openai") {
    return Boolean(env.OPENAI_API_KEY?.trim());
  }

  if (provider === "local") {
    return Boolean(normalizeLocalEndpoint(env.CHAKOD_AI_LOCAL_ENDPOINT));
  }

  return false;
}
