import assert from "node:assert/strict";
import test from "node:test";

import {
  CHAKOD_LOCAL_PUBLIC_API_PREFIX,
  installLocalPublicApiFetchBridge,
  rewriteLocalPublicApiUrl,
  shouldUseLocalPublicApiProxy,
} from "../lib/local-public-api.ts";

test("local public API proxy is enabled only for local development hosts", () => {
  assert.equal(
    shouldUseLocalPublicApiProxy({
      nodeEnv: "development",
      hostname: "127.0.0.1",
    }),
    true,
  );
  assert.equal(
    shouldUseLocalPublicApiProxy({
      nodeEnv: "development",
      hostname: "localhost:5173",
    }),
    true,
  );
  assert.equal(
    shouldUseLocalPublicApiProxy({
      nodeEnv: "production",
      hostname: "127.0.0.1",
    }),
    false,
  );
  assert.equal(
    shouldUseLocalPublicApiProxy({
      nodeEnv: "development",
      hostname: "chakod.com",
    }),
    false,
  );
});

test("Chakod public API URLs are rewritten to the local proxy with query preserved", () => {
  assert.equal(
    rewriteLocalPublicApiUrl({
      value: "https://api.chakod.com/api/listings.php?limit=50&sort=vip",
      nodeEnv: "development",
      hostname: "127.0.0.1",
    }),
    `${CHAKOD_LOCAL_PUBLIC_API_PREFIX}/api/listings.php?limit=50&sort=vip`,
  );

  assert.equal(
    rewriteLocalPublicApiUrl({
      value: "https://example.com/api/listings.php",
      nodeEnv: "development",
      hostname: "127.0.0.1",
    }),
    "https://example.com/api/listings.php",
  );

  assert.equal(
    rewriteLocalPublicApiUrl({
      value: "https://api.chakod.com/api/me.php",
      nodeEnv: "production",
      hostname: "chakod.com",
    }),
    "https://api.chakod.com/api/me.php",
  );
});

test("fetch bridge rewrites string requests and remains disabled outside local development", async () => {
  const captured = [];
  let assignedFetch = null;

  const fakeFetch = async (request) => {
    captured.push(request);
    return new Response(null, { status: 204 });
  };

  const installed = installLocalPublicApiFetchBridge({
    nodeEnv: "development",
    hostname: "127.0.0.1",
    fetchImpl: fakeFetch,
    assignFetch: (nextFetch) => {
      assignedFetch = nextFetch;
    },
  });

  assert.equal(installed, true);
  assert.equal(typeof assignedFetch, "function");

  await assignedFetch("https://api.chakod.com/api/home-banners.php?city=تهران");
  assert.equal(
    captured[0],
    `${CHAKOD_LOCAL_PUBLIC_API_PREFIX}/api/home-banners.php?city=%D8%AA%D9%87%D8%B1%D8%A7%D9%86`,
  );

  let productionAssigned = false;
  assert.equal(
    installLocalPublicApiFetchBridge({
      nodeEnv: "production",
      hostname: "chakod.com",
      fetchImpl: fakeFetch,
      assignFetch: () => {
        productionAssigned = true;
      },
    }),
    false,
  );
  assert.equal(productionAssigned, false);
});
