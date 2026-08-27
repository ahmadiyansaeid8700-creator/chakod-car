import type {
  ChakodAiProviderRequest,
  ChakodAiProviderResult,
} from "./contracts";
import {
  getChakodAiManagerStatus,
  getChakodAiOpenAiModel,
  getChakodAiTimeoutMs,
  normalizeLocalEndpoint,
  type ChakodAiEnv,
} from "./config";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MAX_INSTRUCTIONS_CHARS = 6_000;
const MAX_INPUT_CHARS = 20_000;
const MAX_OUTPUT_CHARS = 50_000;

type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export class ChakodAiProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ChakodAiProviderError";
  }
}

export async function runChakodAiProvider(
  request: ChakodAiProviderRequest,
  env: ChakodAiEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<ChakodAiProviderResult> {
  const normalizedRequest = normalizeRequest(request);
  const manager = getChakodAiManagerStatus(env);

  if (!manager.ready || manager.provider === "disabled") {
    throw new ChakodAiProviderError(
      "Chakod AI Manager is not ready.",
      503,
      "manager_not_ready",
    );
  }

  if (manager.provider === "openai") {
    return runOpenAi(normalizedRequest, env, fetchImpl);
  }

  return runLocal(normalizedRequest, env, fetchImpl);
}

function normalizeRequest(request: ChakodAiProviderRequest) {
  const instructions = request.instructions?.trim() || "";
  const input = request.input?.trim() || "";

  if (!input) {
    throw new ChakodAiProviderError(
      "AI input is required.",
      400,
      "invalid_input",
    );
  }

  if (
    instructions.length > MAX_INSTRUCTIONS_CHARS ||
    input.length > MAX_INPUT_CHARS
  ) {
    throw new ChakodAiProviderError(
      "AI request is too large.",
      413,
      "request_too_large",
    );
  }

  return { instructions, input };
}

async function runOpenAi(
  request: ChakodAiProviderRequest,
  env: ChakodAiEnv,
  fetchImpl: FetchLike,
): Promise<ChakodAiProviderResult> {
  const apiKey = env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new ChakodAiProviderError(
      "OpenAI provider is not configured.",
      503,
      "provider_not_configured",
    );
  }

  const model = getChakodAiOpenAiModel(env);
  const response = await fetchWithIsolation(
    fetchImpl,
    OPENAI_RESPONSES_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: request.instructions || undefined,
        input: request.input,
        store: false,
      }),
    },
    getChakodAiTimeoutMs(env),
  );

  const payload = await readJson(response);

  if (!response.ok) {
    throw new ChakodAiProviderError(
      "AI provider returned an error.",
      502,
      "provider_upstream_error",
    );
  }

  return {
    provider: "openai",
    model,
    text: extractText(payload),
  };
}

async function runLocal(
  request: ChakodAiProviderRequest,
  env: ChakodAiEnv,
  fetchImpl: FetchLike,
): Promise<ChakodAiProviderResult> {
  const endpoint = normalizeLocalEndpoint(env.CHAKOD_AI_LOCAL_ENDPOINT);

  if (!endpoint) {
    throw new ChakodAiProviderError(
      "Local AI provider is not configured safely.",
      503,
      "provider_not_configured",
    );
  }

  const response = await fetchWithIsolation(
    fetchImpl,
    endpoint,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: "0.2",
        mode: "read_suggest",
        instructions: request.instructions,
        input: request.input,
      }),
    },
    getChakodAiTimeoutMs(env),
  );

  const payload = await readJson(response);

  if (!response.ok) {
    throw new ChakodAiProviderError(
      "Local AI provider returned an error.",
      502,
      "provider_upstream_error",
    );
  }

  return {
    provider: "local",
    model: readStringField(payload, "model") || "local",
    text: extractText(payload),
  };
}

async function fetchWithIsolation(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  timeoutMs: number,
) {
  try {
    return await fetchImpl(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ChakodAiProviderError(
      "AI provider is temporarily unavailable.",
      503,
      "provider_unavailable",
    );
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ChakodAiProviderError(
      "AI provider returned an invalid response.",
      502,
      "invalid_provider_response",
    );
  }
}

function extractText(payload: unknown) {
  const direct = readStringField(payload, "output_text") || readStringField(payload, "text");
  if (direct) return direct.slice(0, MAX_OUTPUT_CHARS);

  if (!isRecord(payload) || !Array.isArray(payload.output)) {
    throw invalidProviderResponse();
  }

  const chunks: string[] = [];

  for (const item of payload.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;

    for (const content of item.content) {
      if (!isRecord(content) || content.type !== "output_text") continue;
      if (typeof content.text === "string" && content.text.trim()) {
        chunks.push(content.text.trim());
      }
    }
  }

  const text = chunks.join("\n").trim();
  if (!text) throw invalidProviderResponse();

  return text.slice(0, MAX_OUTPUT_CHARS);
}

function readStringField(payload: unknown, field: string) {
  if (!isRecord(payload)) return "";
  const value = payload[field];
  return typeof value === "string" ? value.trim() : "";
}

function invalidProviderResponse() {
  return new ChakodAiProviderError(
    "AI provider returned no usable text.",
    502,
    "invalid_provider_response",
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
