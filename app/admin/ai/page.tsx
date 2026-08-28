import Link from "next/link";

import {
  getChakodAiManagerStatus,
  getChakodAiOpenAiModel,
  getChakodAiTimeoutMs,
} from "../../../lib/chakod-ai-manager/config";
import {
  getChakodAiToolCatalog,
  getChakodAiToolSummary,
} from "../../../lib/chakod-ai-manager/tools";
import AiSuggestionConsole from "./AiSuggestionConsole";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function providerLabel(provider: "disabled" | "openai" | "local") {
  if (provider === "openai") return "OpenAI";
  if (provider === "local") return "Local";
  return "غیرفعال";
}

function stageLabel(stage: "available" | "registered" | "planned") {
  if (stage === "available") return "فعال";
  if (stage === "registered") return "ثبت‌شده";
  return "برنامه‌ریزی‌شده";
}

export default function AdminAiPage() {
  const manager = getChakodAiManagerStatus();
  const tools = getChakodAiToolCatalog();
  const summary = getChakodAiToolSummary();
  const timeoutMs = getChakodAiTimeoutMs();
  const model = manager.provider === "openai" ? getChakodAiOpenAiModel() : null;

  return (
    <main className={styles.page} dir="rtl">
      <section className={styles.shell}>
        <nav className={styles.topNav}>
          <Link href="/admin">← داشبورد مدیریت</Link>
          <span>Chakod AI Manager v{manager.version}</span>
        </nav>

        <header className={styles.hero}>
          <div>
            <span className={styles.kicker}>CHAKOD AI CONTROL</span>
            <h1>مرکز هوش مصنوعی مدیریت</h1>
            <p>
              این بخش لایه AI را از هسته سایت جدا نگه می‌دارد. Provider قابل تعویض است،
              ابزارها فقط Read-only هستند و هر Write Action آینده نیازمند تأیید انسانی خواهد بود.
            </p>
          </div>

          <div className={manager.ready ? styles.readyState : styles.safeState}>
            <span>{manager.ready ? "READY" : "SAFE OFF"}</span>
            <strong>{manager.ready ? "مدیر هوش مصنوعی آماده است" : "AI Manager هنوز فعال نشده"}</strong>
            <p>
              {manager.ready
                ? "Provider و Feature Flag برای حالت read_suggest آماده‌اند."
                : "هسته سایت مستقل می‌ماند و نبود AI هیچ اختلالی در سرویس اصلی ایجاد نمی‌کند."}
            </p>
          </div>
        </header>

        <section className={styles.statusGrid}>
          <article>
            <span>Provider</span>
            <strong>{providerLabel(manager.provider)}</strong>
            <p>{manager.providerConfigured ? "پیکربندی معتبر" : "نیازمند پیکربندی"}</p>
          </article>
          <article>
            <span>Mode</span>
            <strong>{manager.mode}</strong>
            <p>تحلیل و پیشنهاد بدون تغییر داده</p>
          </article>
          <article>
            <span>Timeout</span>
            <strong>{timeoutMs.toLocaleString("fa-IR")} ms</strong>
            <p>Failure isolation فعال</p>
          </article>
          <article>
            <span>Write Actions</span>
            <strong>ممنوع</strong>
            <p>Human approval اجباری</p>
          </article>
        </section>

        <AiSuggestionConsole enabled={manager.ready} />

        <section className={styles.contentGrid}>
          <div className={styles.toolsPanel}>
            <div className={styles.sectionTitle}>
              <div>
                <span className={styles.kicker}>READ-ONLY TOOL REGISTRY</span>
                <h2>ابزارهای مدیریتی AI</h2>
              </div>
              <div className={styles.toolSummary}>
                <span>{summary.available} فعال</span>
                <span>{summary.registered} ثبت‌شده</span>
                <span>{summary.planned} برنامه</span>
              </div>
            </div>

            <div className={styles.toolList}>
              {tools.map((tool) => (
                <article className={styles.toolCard} key={tool.id}>
                  <div className={styles.toolTop}>
                    <span className={styles.toolId}>{tool.id}</span>
                    <span className={`${styles.stage} ${styles[tool.stage]}`}>
                      {stageLabel(tool.stage)}
                    </span>
                  </div>
                  <strong>{tool.title}</strong>
                  <p>{tool.description}</p>
                  <div className={styles.toolMeta}>
                    <span>Scope: read_only</span>
                    <span>Source: {tool.dataSource}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className={styles.architecturePanel}>
            <div className={styles.sectionTitleCompact}>
              <span className={styles.kicker}>ARCHITECTURE</span>
              <h2>مسیر پردازش</h2>
            </div>

            <div className={styles.architectureFlow}>
              <div>
                <span>01</span>
                <strong>Admin Request</strong>
                <p>درخواست از محیط مدیریت معتبر</p>
              </div>
              <div>
                <span>02</span>
                <strong>Access Gate</strong>
                <p>بررسی نشست و سطح دسترسی قبل از AI</p>
              </div>
              <div>
                <span>03</span>
                <strong>Approved Tools</strong>
                <p>فقط داده‌های Read-only موردنیاز</p>
              </div>
              <div>
                <span>04</span>
                <strong>Provider Adapter</strong>
                <p>{providerLabel(manager.provider)} با Timeout و fail-closed</p>
              </div>
              <div>
                <span>05</span>
                <strong>Suggestion</strong>
                <p>خروجی تحلیلی بدون اجرای تغییر</p>
              </div>
              <div>
                <span>06</span>
                <strong>Human Decision</strong>
                <p>تصمیم نهایی همیشه با مدیر</p>
              </div>
            </div>
          </aside>
        </section>

        <section className={styles.guardrails}>
          <div className={styles.sectionTitle}>
            <div>
              <span className={styles.kicker}>GUARDRAILS</span>
              <h2>مرزهای ایمنی و استقلال سایت</h2>
            </div>
          </div>

          <div className={styles.guardrailGrid}>
            <article>
              <span>01</span>
              <strong>هسته سایت مستقل از AI</strong>
              <p>ورود، آگهی، پروفایل، پرداخت و مسیرهای اصلی برای کارکرد عادی به AI وابسته نیستند.</p>
            </article>
            <article>
              <span>02</span>
              <strong>Secret در UI نمایش داده نمی‌شود</strong>
              <p>API Key، Token، Password و Credential از Status و صفحه مدیریت حذف شده‌اند.</p>
            </article>
            <article>
              <span>03</span>
              <strong>Moderation مستقل باقی می‌ماند</strong>
              <p>
                وضعیت فعلی: {manager.listingModeration.configured ? "پیکربندی شده" : "نیازمند پیکربندی"}.
              </p>
            </article>
            <article>
              <span>04</span>
              <strong>Write Action خودکار وجود ندارد</strong>
              <p>هر قابلیت تغییردهنده آینده باید Permission، Audit و Human Approval مستقل داشته باشد.</p>
            </article>
          </div>
        </section>

        <section className={styles.runtimePanel}>
          <div>
            <span className={styles.kicker}>RUNTIME</span>
            <h2>پیکربندی امن فعلی</h2>
          </div>
          <dl>
            <div>
              <dt>Feature Flag</dt>
              <dd>{manager.requestedEnabled ? "enabled" : "disabled"}</dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{manager.provider}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{model || (manager.provider === "local" ? "local" : "—")}</dd>
            </div>
            <div>
              <dt>Tool Registry</dt>
              <dd>{summary.total} entries</dd>
            </div>
          </dl>
        </section>
      </section>

      <nav className={styles.bottomNav} aria-label="منوی مدیریت AI">
        <Link href="/admin">داشبورد</Link>
        <Link className={styles.active} href="/admin/ai">AI Center</Link>
        <Link href="/admin/listings">آگهی‌ها</Link>
        <Link href="/admin/businesses">کسب‌وکارها</Link>
        <Link href="/">سایت</Link>
      </nav>
    </main>
  );
}
