import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("does not render empty phone or map actions on public business profiles", async () => {
  const page = await source("app/businesses/[slug]/page.tsx");
  assert.match(page, /const phone = String\(business\.phone \|\| ""\)\.trim\(\)/);
  assert.match(page, /\{phone \? \(/);
  assert.match(page, /href=\{`tel:\$\{phone\}`\}/);
  assert.match(page, /const mapHref = hasCoordinates/);
  assert.match(page, /\{mapHref \? \(/);
  assert.match(page, /String\(business\.whatsapp_phone \|\| ""\)/);
});

test("keeps retired affiliate pages out of active business navigation and the master sitemap", async () => {
  const adminBusinesses = await source("app/admin/businesses/BusinessesAdminClient.tsx");
  const masterSitemap = await source("docs/MASTER-SITEMAP-FA.md");

  assert.doesNotMatch(adminBusinesses, /href="\/admin\/affiliate"/);
  assert.doesNotMatch(masterSitemap, /^\/affiliate(?:\/|$)/m);
  assert.doesNotMatch(masterSitemap, /^\/account\/affiliate(?:\/|$)/m);
  assert.doesNotMatch(masterSitemap, /^\/admin\/affiliate(?:\/|$)/m);
});
