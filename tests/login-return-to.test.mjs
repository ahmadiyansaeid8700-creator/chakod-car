import assert from "node:assert/strict";
import test from "node:test";

import { safeReturnTo } from "../app/login/return-to.ts";

test("keeps a valid internal returnTo path including query and hash", () => {
  assert.equal(
    safeReturnTo("/account/listings?status=pending#results"),
    "/account/listings?status=pending#results",
  );
});

test("rejects external and protocol-relative returnTo values", () => {
  assert.equal(safeReturnTo("https://example.com/account"), "/");
  assert.equal(safeReturnTo("//example.com/account"), "/");
  assert.equal(safeReturnTo("/\\example.com/account"), "/");
});

test("rejects a login loop and uses the supplied safe fallback", () => {
  assert.equal(safeReturnTo("/login?returnTo=/dashboard", "/account"), "/account");
  assert.equal(safeReturnTo("/login/", "/dashboard"), "/dashboard");
});

test("uses the root path when both returnTo and fallback are unsafe", () => {
  assert.equal(safeReturnTo("https://example.com", "//example.com"), "/");
  assert.equal(safeReturnTo(null, "/login"), "/");
});
