import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shell = await readFile(new URL("../app/admin/AdminShell.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/admin/layout.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/admin/AdminShell.module.css", import.meta.url), "utf8");

test("wraps every protected admin route in the unified shell", () => {
  assert.match(layout, /<AdminShell>\{children\}<\/AdminShell>/);
  assert.doesNotMatch(layout, /AdminSectionNav/);
});

test("keeps core, content, commerce and system destinations discoverable", () => {
  for (const href of [
    "/admin/listings",
    "/admin/businesses",
    "/admin/business-verifications",
    "/admin/users",
    "/admin/articles",
    "/admin/featured-showrooms",
    "/admin/commerce",
    "/admin/refunds",
    "/admin/rules",
    "/admin/audit-logs",
  ]) {
    assert.match(shell, new RegExp(`href: "${href.replaceAll("/", "\\/")}"`));
  }
});

test("provides active-route, compact desktop and mobile drawer states", () => {
  assert.match(shell, /aria-current=\{active \? "page"/);
  assert.match(shell, /setCompact/);
  assert.match(shell, /aria-expanded=\{open\}/);
  assert.match(css, /@media\(max-width:1050px\)/);
  assert.match(css, /\.sidebarOpen/);
  assert.match(css, /prefers-reduced-motion/);
});
