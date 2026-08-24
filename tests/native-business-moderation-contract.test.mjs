import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminApi = await readFile(new URL("../app/api/admin/account-activities/route.ts", import.meta.url), "utf8");
const publicApi = await readFile(new URL("../app/api/businesses/route.ts", import.meta.url), "utf8");
const publicResume = await readFile(new URL("../app/api/business-resumes/[id]/route.ts", import.meta.url), "utf8");
const adminClient = await readFile(new URL("../app/admin/businesses/BusinessesAdminClient.tsx", import.meta.url), "utf8");
const resumeEditor = await readFile(new URL("../app/account-v2/businesses/[id]/BusinessResumeEditor.tsx", import.meta.url), "utf8");

test("sends native account activities to the protected admin queue", () => {
  assert.match(adminApi, /readVerificationAdmin/);
  assert.match(adminApi, /activityType.*dealer/);
  assert.match(adminClient, /\/api\/admin\/account-activities/);
});

test("admin approval activates native businesses for public discovery", () => {
  assert.match(adminApi, /approved: "active"/);
  assert.match(adminApi, /verificationStatus: status === "active" \? "verified"/);
  assert.match(publicApi, /eq\(accountActivities\.status, "active"\)/);
  assert.match(publicResume, /activity\.status !== "active"/);
});

test("uses the first album image as the public poster", () => {
  assert.match(publicApi, /cover_url: gallery\[0\]\?\.url/);
  assert.match(resumeEditor, /تصویر اول آلبوم به‌عنوان پوستر اصلی/);
});
