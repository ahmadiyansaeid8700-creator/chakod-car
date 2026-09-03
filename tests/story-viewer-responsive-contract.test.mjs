import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("uses invisible physical tap zones like an Instagram story viewer", async () => {
  const source = await read("app/components/HomeStoriesUnified.tsx");

  assert.match(source, /className=\{styles\.tapPrevious\}[\s\S]*onClick=\{previous\}/);
  assert.match(source, /className=\{styles\.tapNext\}[\s\S]*onClick=\{next\}/);
  assert.match(source, /aria-label="استوری قبلی"/);
  assert.match(source, /aria-label="استوری بعدی"/);
});

test("renders a blurred media backdrop behind contained story media", async () => {
  const source = await read("app/components/HomeStoriesUnified.tsx");
  const css = await read("app/components/HomeStoriesUnified.module.css");

  assert.match(source, /className=\{styles\.mediaBackdrop\}/);
  assert.match(source, /backgroundImage:/);
  assert.match(css, /\.mediaBackdrop\s*\{[\s\S]*filter:\s*blur\(/);
  assert.match(css, /\.media\s*>\s*img,[\s\S]*object-fit:\s*contain/);
});

test("fills the entire mobile viewport and respects safe areas", async () => {
  const css = await read("app/components/HomeStoriesUnified.module.css");
  const mobile = css.slice(css.indexOf("@media (max-width: 640px)"));

  assert.match(mobile, /\.viewer\s*\{[\s\S]*padding:\s*0\s*;/);
  assert.match(mobile, /\.viewerCard\s*\{[\s\S]*width:\s*100%\s*;/);
  assert.match(mobile, /\.viewerCard\s*\{[\s\S]*height:\s*100dvh\s*;/);
  assert.match(mobile, /\.viewerCard\s*\{[\s\S]*aspect-ratio:\s*auto\s*;/);
  assert.match(mobile, /\.viewerCard\s*\{[\s\S]*border:\s*0\s*;/);
  assert.match(mobile, /\.viewerCard\s*\{[\s\S]*border-radius:\s*0\s*;/);
  assert.match(mobile, /\.progress\s*\{[\s\S]*top:\s*max\([^;]*safe-area-inset-top/);
});

test("keeps the mobile action area compact and removes QR", async () => {
  const css = await read("app/components/HomeStoriesUnified.module.css");
  const mobile = css.slice(css.indexOf("@media (max-width: 640px)"));

  assert.match(mobile, /\.storyQr\s*\{\s*display:\s*none\s*;/);
  assert.match(mobile, /\.storyActions\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+56px/);
  assert.match(mobile, /\.details h3\s*\{[\s\S]*-webkit-line-clamp:\s*2\s*;/);
  assert.match(mobile, /\.details\s*\{[\s\S]*bottom:\s*max\([^;]*safe-area-inset-bottom/);
});
