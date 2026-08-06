import assert from "node:assert/strict";
import test from "node:test";

import { createLocalDevelopmentSession } from "../lib/local-development-login.ts";

test("creates the local development session with same-origin credentials", async () => {
  let capturedInput;
  let capturedInit;

  const result = await createLocalDevelopmentSession(async (input, init) => {
    capturedInput = input;
    capturedInit = init;

    return new Response(
      JSON.stringify({
        success: true,
        local_development: true,
        redirect_to: "/account?complete=1",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  });

  assert.equal(capturedInput, "/api/auth/dev-session");
  assert.equal(capturedInit?.method, "POST");
  assert.equal(capturedInit?.credentials, "include");
  assert.equal(capturedInit?.headers?.Accept, "application/json");
  assert.deepEqual(result, {
    success: true,
    redirectTo: "/account?complete=1",
  });
});

test("returns the server message when the local session endpoint rejects", async () => {
  const result = await createLocalDevelopmentSession(async () =>
    new Response(
      JSON.stringify({
        success: false,
        message: "مسیر در دسترس نیست.",
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    ),
  );

  assert.deepEqual(result, {
    success: false,
    message: "مسیر در دسترس نیست.",
  });
});

test("uses a safe failure result for malformed or unavailable responses", async () => {
  const malformed = await createLocalDevelopmentSession(async () =>
    new Response("not-json", { status: 502 }),
  );
  const unavailable = await createLocalDevelopmentSession(async () => {
    throw new Error("network unavailable");
  });

  assert.equal(malformed.success, false);
  assert.match(malformed.message, /ورود آزمایشی لوکال انجام نشد/);
  assert.equal(unavailable.success, false);
  assert.match(unavailable.message, /ورود آزمایشی لوکال انجام نشد/);
});
