"use client";

import { FormEvent, useState } from "react";

import styles from "./AiSuggestionConsole.module.css";

type SuggestionResponse = {
  success?: boolean;
  message?: string;
  suggestion?: {
    provider: string;
    model: string;
    text: string;
    generatedAt: string;
    writeActionsExecuted: false;
  };
};

const quickQuestions = [
  "الان کدام بخش‌های سایت بیشتر نیاز به توجه مدیریت دارند؟",
  "از روی وضعیت فعلی، اولویت‌های عملیاتی امروز را مشخص کن.",
  "ریسک‌ها و نقاطی که داده کافی ندارند را جداگانه بگو.",
];

export default function AiSuggestionConsole({ enabled }: { enabled: boolean }) {
  const [question, setQuestion] = useState(quickQuestions[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SuggestionResponse["suggestion"] | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || loading || !question.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/ai/manager/suggest", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: question.trim() }),
      });

      const payload = (await response.json()) as SuggestionResponse;

      if (!response.ok || !payload.success || !payload.suggestion) {
        throw new Error(payload.message || "تحلیل AI انجام نشد.");
      }

      setResult(payload.suggestion);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تحلیل AI انجام نشد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <div>
          <span className={styles.kicker}>MANAGEMENT SUGGESTION</span>
          <h2>کنسول تحلیل مدیریتی</h2>
        </div>
        <span className={enabled ? styles.ready : styles.disabled}>
          {enabled ? "READ-ONLY READY" : "PROVIDER OFF"}
        </span>
      </div>

      <p className={styles.intro}>
        این کنسول فقط Snapshot خلاصه و Sanitized از Toolهای Read-only را به Provider می‌دهد.
        هیچ عملیات تغییردهنده‌ای از این مسیر اجرا نمی‌شود.
      </p>

      <div className={styles.quickQuestions}>
        {quickQuestions.map((item) => (
          <button key={item} type="button" onClick={() => setQuestion(item)} disabled={loading}>
            {item}
          </button>
        ))}
      </div>

      <form className={styles.form} onSubmit={submit}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={2500}
          placeholder="مثلاً: امروز اول کدام صف‌ها و هشدارها را بررسی کنم؟"
          disabled={!enabled || loading}
        />
        <div className={styles.actions}>
          <span>{question.length.toLocaleString("fa-IR")} / ۲۵۰۰</span>
          <button type="submit" disabled={!enabled || loading || !question.trim()}>
            {loading ? "در حال تحلیل..." : "تحلیل وضعیت"}
          </button>
        </div>
      </form>

      {!enabled && (
        <div className={styles.notice}>
          Provider هنوز آماده نیست. با فعال‌شدن Feature Flag و Provider معتبر، همین کنسول آماده استفاده خواهد بود.
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <div className={styles.result}>
          <div>
            <strong>پیشنهاد AI</strong>
            <span>{result.provider} · {result.model}</span>
          </div>
          <p>{result.text}</p>
          <small>هیچ Write Action اجرا نشده است.</small>
        </div>
      )}
    </section>
  );
}
