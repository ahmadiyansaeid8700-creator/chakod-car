export type ChakodAiProvider = "disabled" | "openai" | "local";

export type ChakodAiMode = "read_suggest";

export type ChakodAiManagerStatus = {
  version: "0.1";
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
