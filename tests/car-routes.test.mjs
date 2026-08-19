import assert from "node:assert/strict";
import test from "node:test";
import {
  carDetailPath,
  carMarketPath,
  legacyAdsRedirect,
  withSearchParams,
} from "../lib/car-routes.ts";

test("canonical market segments use the approved /cars routes", () => {
  assert.equal(carMarketPath("all"), "/cars");
  assert.equal(carMarketPath("luxury"), "/cars/luxury");
  assert.equal(carMarketPath("freezone"), "/cars/free-zone");
  assert.equal(carMarketPath("economic"), "/cars?segment=economic");
});

test("listing ids are encoded into the canonical detail route", () => {
  assert.equal(carDetailPath(42), "/cars/42");
  assert.equal(carDetailPath("car 42"), "/cars/car%2042");
});

test("legacy catalog redirects preserve filters", () => {
  assert.equal(
    legacyAdsRedirect("luxury", { brand: "bmw", city: "تهران" }),
    "/cars/luxury?brand=bmw&city=%D8%AA%D9%87%D8%B1%D8%A7%D9%86",
  );
  assert.equal(
    legacyAdsRedirect("economic", { page: "2" }),
    "/cars?segment=economic&page=2",
  );
});

test("query helpers replace existing keys without dropping repeated values", () => {
  assert.equal(
    withSearchParams("/cars?segment=economic", {
      segment: "all",
      brand: ["bmw", "benz"],
    }),
    "/cars?segment=all&brand=bmw&brand=benz",
  );
});
