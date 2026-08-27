from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_required(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"required replacement not found: {label}")
    return text.replace(old, new)


def sub_required(text: str, pattern: str, repl: str, label: str, flags: int = 0) -> str:
    updated, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"required regex replacement failed ({count}): {label}")
    return updated


# The product no longer supports user-driven banner reservations.
# Keep manual homepage-banner management; remove only reservation flows.
for relative in [
    "app/account/ads",
    "app/admin/banner-reservations",
    "app/api/admin/banner-reservations",
    "app/api/banner-reservations",
]:
    target = ROOT / relative
    if target.exists():
        shutil.rmtree(target)
        print(f"deleted {relative}")

for relative in [
    "lib/banner-booking.ts",
    "lib/admin-access.ts",
    "db/index.ts",
    "db/schema.ts",
    "drizzle.config.ts",
    "drizzle/0000_curvy_wildside.sql",
    "drizzle/meta/0000_snapshot.json",
    "drizzle/meta/_journal.json",
]:
    target = ROOT / relative
    if target.exists():
        target.unlink()
        print(f"deleted {relative}")

for relative in ["db", "drizzle/meta", "drizzle"]:
    target = ROOT / relative
    if target.exists() and target.is_dir() and not any(target.iterdir()):
        target.rmdir()

# Account dashboard: remove the banner-reservation CTA and keep useful current actions.
path = "app/account/page.tsx"
text = read(path)
text = sub_required(
    text,
    r'\n\s*<section className=\{styles\.growthCard\} aria-label="رشد و دیده‌شدن بیشتر">.*?\n\s*</section>',
    '''\n              <section className={styles.growthCard} aria-label="مدیریت فعالیت‌های حساب">\n                <div className={styles.growthCopy}>\n                  <span>مدیریت حساب</span>\n                  <h2>فعالیت‌های چاکود را از پنل مرتبط مدیریت کنید</h2>\n                  <p>آگهی‌ها و خدمات حرفه‌ای شما بدون مسیر رزرو بنر از بخش‌های اصلی حساب در دسترس هستند.</p>\n                </div>\n                <div className={styles.growthActions}>\n                  {stats.total > 0 && !isBusinessDirectoryAccount && (\n                    <a className={styles.growthPrimary} href="/account/listings">مدیریت آگهی‌ها</a>\n                  )}\n                  {isBusinessDirectoryAccount && (\n                    <a className={styles.growthPrimary} href="/account/services">مدیریت خدمات حرفه‌ای</a>\n                  )}\n                </div>\n              </section>''',
    "account growth card",
    flags=re.S,
)
write(path, text)

# Admin command center: commerce remains, banner reservation wording does not.
path = "app/admin/page.tsx"
text = read(path)
text = replace_required(
    text,
    'description: "تعرفه‌ها، پرداخت‌ها، اشتراک‌ها، بنرها و تنظیمات تجاری.",',
    'description: "تعرفه‌ها، پرداخت‌ها، اشتراک‌ها و تنظیمات تجاری.",',
    "admin commerce description",
)
write(path, text)

# Commerce admin: preserve pricing/orders/subscriptions/discounts/admins/audit,
# remove banner-reservation UI and prevent retired home_banner services from resurfacing.
path = "app/admin/commerce/CommerceAdminClient.tsx"
text = read(path)

for old, label in [
    ('  banners_view: boolean;\n', "capability banners_view"),
    ('  banners_manage: boolean;\n', "capability banners_manage"),
    ('  banner_price_toman: number;\n', "province banner price"),
    ('  banner_day_capacity: number;\n', "province banner capacity"),
    ('  banner_is_active: boolean;\n', "province banner active"),
    ('    pending_banners: number | null;\n', "summary pending banners"),
    ('  banners?: Banner[];\n', "response banners"),
    ('  ["banners.view", "مشاهده بنرها"],\n', "permission banners view"),
    ('  ["banners.manage", "تأیید و رد بنرها"],\n', "permission banners manage"),
    ('  banners_view: "مشاهده رزروهای بنر",\n', "capability label banners view"),
    ('  banners_manage: "مدیریت رزروهای بنر",\n', "capability label banners manage"),
    ('  banners: "▧",\n', "tab icon banners"),
    ('  { key: "banner", title: "بنر صفحه اصلی", description: "رزرو روزانه بنر استانی", match: (key: string) => key.startsWith("home_banner") },\n', "banner service group"),
    ('  review_banner: "بررسی رزرو بنر",\n', "banner audit label"),
    ('  const [bannerNotes, setBannerNotes] = useState<Record<number, string>>({});\n', "banner notes state"),
    ('        banners: payload.banners ?? current?.banners,\n', "payload banners merge"),
    ('      if (payload.banners) setBannerNotes(Object.fromEntries(payload.banners.map((item) => [item.id, item.admin_note || ""])));\n', "payload banner notes"),
    ('    if (caps?.banners_view) items.push({ key: "banners", label: "رزرو بنر" });\n', "banner tab"),
]:
    text = replace_required(text, old, "", label)

text = sub_required(
    text,
    r'\ntype Banner = \{.*?\n\};\n',
    "\n",
    "Banner type",
    flags=re.S,
)

text = replace_required(
    text,
    'type Tab = "overview" | "pricing" | "provinces" | "discounts" | "orders" | "subscriptions" | "banners" | "admins" | "audit";',
    'type Tab = "overview" | "pricing" | "provinces" | "discounts" | "orders" | "subscriptions" | "admins" | "audit";',
    "Tab union",
)

text = replace_required(
    text,
    '        services: payload.services ?? current?.services,',
    '        services: (payload.services ?? current?.services ?? []).filter((item) => !item.service_key.startsWith("home_banner")),',
    "filter retired banner services",
)

text = replace_required(
    text,
    '  const enabledCapabilities = useMemo(\n    () => Object.entries(caps || {}).filter(([, value]) => Boolean(value)),',
    '  const enabledCapabilities = useMemo(\n    () => Object.entries(caps || {}).filter(([key, value]) => key in capabilityLabels && Boolean(value)),',
    "filter retired backend banner capabilities",
)

# Remove overview banner queue card.
text = sub_required(
    text,
    r'\n\s*\{data\.summary\?\.pending_banners !== null && \(\s*<article className=\{styles\.summaryCard\}>.*?بنرهای نیازمند بررسی.*?</article>\s*\)\}',
    "",
    "pending banner summary card",
    flags=re.S,
)

# Remove quick action for pending banner reservations.
text = sub_required(
    text,
    r'\n\s*\{caps\?\.banners_view && Number\(data\.summary\?\.pending_banners \|\| 0\) > 0 && <button.*?رزروهای بنر در انتظار بررسی.*?</button>\}',
    "",
    "pending banner quick action",
    flags=re.S,
)
text = replace_required(
    text,
    '{Number(data.summary?.pending_banners || 0) === 0 && Number(data.summary?.pending_orders || 0) === 0 &&',
    '{Number(data.summary?.pending_orders || 0) === 0 &&',
    "clear queue condition",
)

# Province pricing: keep story pricing only.
text = replace_required(
    text,
    '<th>استوری ۲۴ساعته</th><th>بنر روزانه</th><th>ظرفیت بنر</th><th>وضعیت</th>',
    '<th>استوری ۲۴ساعته</th><th>وضعیت</th>',
    "province banner headers",
)
text = sub_required(
    text,
    r'<td><input type="number" value=\{draft\.banner_price_toman\}.*?</td>',
    "",
    "province banner price cell",
    flags=re.S,
)
text = sub_required(
    text,
    r'<td><input type="number" value=\{draft\.banner_day_capacity\}.*?</td>',
    "",
    "province banner capacity cell",
    flags=re.S,
)
text = sub_required(
    text,
    r'<label className=\{styles\.miniCheck\}><input type="checkbox" checked=\{draft\.banner_is_active\}.*?<span>بنر</span></label>',
    "",
    "province banner active control",
    flags=re.S,
)
text = replace_required(
    text,
    'onClick={()=>void patch({action:"update_province",...draft},`province-${province.province}`)}',
    'onClick={()=>void patch({action:"update_province",province:draft.province,is_large:draft.is_large,story_price_toman:draft.story_price_toman,story_duration_hours:draft.story_duration_hours,story_is_active:draft.story_is_active},`province-${province.province}`)}',
    "province patch payload",
)
text = sub_required(
    text,
    r'<td colSpan=\{7\}><div className=\{styles\.inlineEmpty\}>استانی با این فیلتر پیدا نشد\.</div></td>',
    '<td colSpan={5}><div className={styles.inlineEmpty}>استانی با این فیلتر پیدا نشد.</div></td>',
    "province empty colspan",
)

# Remove the complete banner-reservation review tab.
text = sub_required(
    text,
    r'\n\s*\{activeTab === "banners" && caps\?\.banners_view && \(.*?\n\s*\)\}\n\n\s*(\{activeTab === "admins")',
    r'\n\n        \1',
    "banner admin tab body",
    flags=re.S,
)

write(path, text)

# Cloudflare runtime no longer needs the retired D1 reservation database type.
path = "types/cloudflare-runtime.d.ts"
text = read(path)
text = re.sub(r'\ninterface D1Database \{\n  prepare\(query: string\): unknown;\n\}\n?', "\n", text)
write(path, text)

# Runtime env should not retain the old D1 binding.
path = "lib/runtime-env.ts"
text = read(path)
text = text.replace("  DB: D1Database;\n", "")
text = text.replace("  CHAKOD_ADMIN_EMAILS?: string;\n", "")
write(path, text)

# Remove unused Drizzle dependencies/scripts after the D1 reservation stack is gone.
package_path = ROOT / "package.json"
package = json.loads(package_path.read_text(encoding="utf-8"))
package.get("scripts", {}).pop("db:generate", None)
package.get("dependencies", {}).pop("drizzle-orm", None)
package.get("devDependencies", {}).pop("drizzle-kit", None)
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# Keep project notes aligned with the current product.
for doc in ["PROJECT_CONTEXT.md", "TODO.md"]:
    doc_path = ROOT / doc
    if not doc_path.exists():
        continue
    content = doc_path.read_text(encoding="utf-8")
    content = content.replace(
        "- [x] صفحه رزرو جدید `/account/ads` که از Commerce/Auth فعلی چاکود استفاده می‌کند حفظ شده است.\n",
        "- [x] قابلیت رزرو بنر توسط کاربر به‌طور کامل از رابط و مسیرهای برنامه حذف شده است.\n",
    )
    content = content.replace(
        "- [x] حفظ `/account/ads` جدید مبتنی بر `/api/auth/commerce`\n",
        "- [x] حذف `/account/ads` و تمام CTA/تب‌های رزرو بنر\n",
    )
    content = content.replace("- Drizzle / D1\n", "")
    doc_path.write_text(content, encoding="utf-8")

# Guard: no executable application code may still expose banner reservation flows.
forbidden = [
    "/account/ads",
    "banner-reservations",
    "رزرو بنر",
    "رزرو تبلیغ منطقه‌ای",
    "reserve_banner",
    "review_banner",
    "pending_banners",
]
remaining: list[str] = []
for base in ["app", "lib", "worker"]:
    root = ROOT / base
    if not root.exists():
        continue
    for file in root.rglob("*"):
        if not file.is_file() or file.suffix not in {".ts", ".tsx", ".js", ".jsx", ".mjs"}:
            continue
        content = file.read_text(encoding="utf-8", errors="ignore")
        for token in forbidden:
            if token in content:
                remaining.append(f"{file.relative_to(ROOT)} -> {token}")

if remaining:
    raise RuntimeError("banner reservation remnants remain:\n" + "\n".join(remaining))

print("Banner reservation cleanup completed with no app-code remnants.")
