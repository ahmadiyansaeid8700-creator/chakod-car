import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCOUNT_LISTINGS_PATH,
  NEW_ACCOUNT_LISTING_PATH,
  accountListingPath,
  legacyListingRedirect,
} from "../lib/listing-routes.ts";

test("canonical listing routes are under the account namespace", () => {
  assert.equal(ACCOUNT_LISTINGS_PATH, "/account/listings");
  assert.equal(NEW_ACCOUNT_LISTING_PATH, "/account/listings/new");
  assert.equal(accountListingPath(42), "/account/listings/42");
});

test("legacy submit and dashboard routes map to canonical routes", () => {
  assert.equal(legacyListingRedirect("/submit"), "/account/listings/new");
  assert.equal(legacyListingRedirect("/dashboard/listings"), "/account/listings");
  assert.equal(
    legacyListingRedirect("/dashboard/listings/42"),
    "/account/listings/42",
  );
});

test("unrelated paths are not treated as listing redirects", () => {
  assert.equal(legacyListingRedirect("/dashboard"), null);
  assert.equal(legacyListingRedirect("/submit-listing"), null);
});
