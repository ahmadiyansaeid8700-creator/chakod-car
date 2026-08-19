import assert from "node:assert/strict";
import test from "node:test";

import {
  isDealerListing,
  isUsableListingPhone,
  normalizeListingPhone,
  publicSellerName,
} from "../lib/listing-publication-policy.ts";

test("normalizes Persian and formatted contact numbers", () => {
  assert.equal(normalizeListingPhone("۰۹۱۲ ۱۲۳ ۴۵۶۷"), "09121234567");
  assert.equal(normalizeListingPhone("+98 912 123 4567"), "+989121234567");
});

test("requires an Iranian-format contact number before public display", () => {
  assert.equal(isUsableListingPhone("09121234567"), true);
  assert.equal(isUsableListingPhone("+989121234567"), true);
  assert.equal(isUsableListingPhone("00989121234567"), true);
  assert.equal(isUsableListingPhone("9121234567"), false);
  assert.equal(isUsableListingPhone(""), false);
});

test("never exposes a personal seller name in the public label", () => {
  assert.equal(
    publicSellerName({ seller_type: "personal", dealer_name: "نام کاربر" }),
    "شخصی",
  );
  assert.equal(publicSellerName({ listing_owner_type: "personal" }), "شخصی");
});

test("keeps dealership identity only for dealership listings", () => {
  const dealer = {
    seller_type: "dealer",
    dealer_id: 14,
    dealer_name: "نمایشگاه نمونه",
  };

  assert.equal(isDealerListing(dealer), true);
  assert.equal(publicSellerName(dealer), "نمایشگاه نمونه");
});
