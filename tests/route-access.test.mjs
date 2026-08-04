import assert from "node:assert/strict";
import test from "node:test";

import {
  canOpenAdminCommerce,
  hasAdminRouteAccess,
  hasAuthenticatedRouteAccess,
} from "../lib/route-access.ts";

test("requires a confirmed authenticated identity for private dealer routes", () => {
  assert.equal(hasAuthenticatedRouteAccess({ success: true, logged_in: true }), true);
  assert.equal(hasAuthenticatedRouteAccess({ success: true, logged_in: false }), false);
  assert.equal(hasAuthenticatedRouteAccess(null), false);
});

test("requires an explicitly confirmed admin identity for admin routes", () => {
  assert.equal(hasAdminRouteAccess({ success: true, is_admin: true }), true);
  assert.equal(hasAdminRouteAccess({ success: true, is_admin: false }), false);
  assert.equal(hasAdminRouteAccess({ success: false, is_admin: true }), false);
});

test("does not expose commerce merely because a user is an admin", () => {
  assert.equal(canOpenAdminCommerce({ role: "viewer", permissions: [] }), false);
  assert.equal(canOpenAdminCommerce({ role: "finance", permissions: [] }), true);
  assert.equal(
    canOpenAdminCommerce({ role: "admin", permissions: ["orders.view"] }),
    true,
  );
});
