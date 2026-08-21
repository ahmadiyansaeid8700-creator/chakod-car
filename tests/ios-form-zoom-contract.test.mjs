import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../app/ios-form-runtime.css", import.meta.url), "utf8");

test("prevents iOS focus zoom for every text-entry surface including portals", () => {
  assert.match(css, /@supports \(-webkit-touch-callout: none\)/);
  assert.doesNotMatch(css, /@media \(max-width:/);
  assert.match(css, /(?:^|\n)\s*input:not\(\[type="checkbox"\]\)/);
  assert.match(css, /(?:^|\n)\s*textarea,/);
  assert.match(css, /(?:^|\n)\s*select,/);
  assert.match(css, /\[contenteditable\]:not\(\[contenteditable="false"\]\)/);
  assert.match(css, /font-size: 16px !important/);
  assert.doesNotMatch(css, /\.appViewport input/);
});
