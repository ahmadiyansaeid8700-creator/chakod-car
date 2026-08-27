export type ChakodAiProvider = "disabled" | "openai" | "local";

export type ChakodAiMode = "read_suggest";

export type ChakodAiManagerStatus = {
  version: "0.2";
  requestedEnabled: boolean;
  ready: boolean;
  provider: ChakodAiProvider;
  providerConfigured: boolean;
  mode: ChakodAiMode;
  writeActionsAllowed: false;
  listingModeration: {
    preserved: true;
    configured: boolean;
  };
};

export type ChakodAiProviderRequest = {
  instructions: string;
  input: string;
};

export type ChakodAiProviderResult = {
  provider: Exclude<ChakodAiProvider, "disabled">;
  model: string;
  text: string;
};
