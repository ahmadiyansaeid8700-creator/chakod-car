"use client";

import { installLocalPublicApiFetchBridge } from "../../lib/local-public-api";

type BridgeWindow = Window & {
  __chakodLocalPublicApiBridgeInstalled?: boolean;
};

if (typeof window !== "undefined") {
  const bridgeWindow = window as BridgeWindow;

  if (!bridgeWindow.__chakodLocalPublicApiBridgeInstalled) {
    const installed = installLocalPublicApiFetchBridge({
      nodeEnv: process.env.NODE_ENV,
      hostname: window.location.hostname,
      fetchImpl: window.fetch.bind(window),
      assignFetch: (nextFetch) => {
        window.fetch = nextFetch;
      },
    });

    if (installed) {
      bridgeWindow.__chakodLocalPublicApiBridgeInstalled = true;
    }
  }
}

export default function LocalPublicApiBridge() {
  return null;
}
