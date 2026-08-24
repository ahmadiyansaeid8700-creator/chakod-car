"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  DEFAULT_HOME_LOCATION,
  loadHomeLocation,
} from "./home-location";
import styles from "./ChakodAiAssistant.module.css";

type AssistantMode = "user" | "admin";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AssistantAction = {
  label: string;
  href: string;
};

type AssistantResultCard = {
  kind: "listing" | "admin_listing";
  id: number;
  title: string;
  href: string;
  price_toman: number | null;
  badge: string;
  tone: "neutral" | "good" | "warning" | "danger";
  facts: string[];
};

type AssistantMeta = {
  confidence: "high" | "medium" | "low";
  data_status: "live" | "partial" | "unavailable";
  data_notice: string;
};

type AssistantResponse =
  | {
      success: true;
      configured: boolean;
      mode: AssistantMode;
      confidence: AssistantMeta["confidence"];
      data_status: AssistantMeta["data_status"];
      data_notice: string;
      reply: string;
      suggestions?: string[];
      actions?: AssistantAction[];
      cards?: AssistantResultCard[];
    }
  | {
      success: false;
      message?: string;
    };

const USER_SUGGESTIONS = [
  "ماشینم ایراد پیدا کرده؛ راهنمایی‌ام کن",
  "چه روغنی برای خودروی من مناسبه؟",
  "سایز تایر ماشینم چنده؟",
  "برای خرید خودرو راهنمایی می‌خوام",
];

const ADMIN_SUGGESTIONS = [
  "خلاصه وضعیت امروز سایت را بده",
  "آگهی‌های نیازمند پیگیری را اولویت‌بندی کن",
  "ریسک و کیفیت صف آگهی‌ها را تحلیل کن",
  "چه کارهایی را امروز زودتر انجام بدهم؟",
];

const DEFAULT_META: AssistantMeta = {
  confidence: "low",
  data_status: "unavailable",
  data_notice: "با اولین پرسش، دادهٔ مرتبط را زنده بررسی می‌کنم.",
};

function introMessage(mode: AssistantMode): ChatMessage {
  return {
    id: `intro-${mode}`,
    role: "assistant",
    content:
      mode === "admin"
        ? "سلام، من دستیار مدیریت چاکود هستم. می‌توانم صف آگهی‌ها، ریسک‌ها، موارد معطل و اولویت کار امروز را تحلیل کنم؛ اجرای هر تصمیم همچنان با تأیید خود ادمین انجام می‌شود."
        : "سلام رفیق، خوش اومدی 👋 من هوش خودرویی چاکودم. درباره خرید و فروش ماشین، عیب‌یابی اولیه، روغن و لاستیک، سرویس و پیدا کردن خدمات خودرویی کنارت هستم. امروز چه کمکی ازم می‌خوای؟",
  };
}

export default function ChakodAiAssistant() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AssistantMode>("user");
  const [messages, setMessages] = useState<ChatMessage[]>([
    introMessage("user"),
  ]);
  const [suggestions, setSuggestions] = useState(USER_SUGGESTIONS);
  const [actions, setActions] = useState<AssistantAction[]>([]);
  const [cards, setCards] = useState<AssistantResultCard[]>([]);
  const [meta, setMeta] = useState<AssistantMeta>(DEFAULT_META);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [announced, setAnnounced] = useState("");
  const panelRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef<AssistantMode>("user");
  const initializedRef = useRef(false);

  const restoreMode = useCallback((nextMode: AssistantMode) => {
    const restored = loadConversation(nextMode);
    modeRef.current = nextMode;
    setMode(nextMode);
    setMessages(restored?.messages || [introMessage(nextMode)]);
    setSuggestions(
      restored?.suggestions ||
        (nextMode === "admin" ? ADMIN_SUGGESTIONS : USER_SUGGESTIONS),
    );
    setActions(restored?.actions || []);
    setCards(restored?.cards || []);
    setMeta(restored?.meta || DEFAULT_META);
  }, []);

  useEffect(() => {
    const syncMode = () => {
      const path = window.location.pathname;
      const nextMode: AssistantMode =
        path.startsWith("/admin") ? "admin" : "user";

      if (initializedRef.current && modeRef.current === nextMode) return;
      initializedRef.current = true;
      restoreMode(nextMode);
    };

    syncMode();
    window.addEventListener("popstate", syncMode);
    window.addEventListener("storage", syncMode);

    return () => {
      window.removeEventListener("popstate", syncMode);
      window.removeEventListener("storage", syncMode);
    };
  }, [restoreMode]);

  useEffect(() => {
    if (!initializedRef.current || sending) return;
    saveConversation(mode, {
      messages: messages.slice(-12),
      suggestions: suggestions.slice(0, 4),
      actions: actions.slice(0, 4),
      cards: cards.slice(0, 5),
      meta,
    });
  }, [actions, cards, messages, meta, mode, sending, suggestions]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    messageEndRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [actions, cards, messages, open, sending]);

  const modeCopy = useMemo(
    () =>
      mode === "admin"
        ? {
            title: "دستیار مدیریت",
            subtitle: "تحلیل و اولویت‌بندی عملیات سایت",
            placeholder: "از وضعیت سایت یا آگهی‌ها بپرس...",
          }
        : {
            title: "هوش چاکود",
            subtitle: "کارشناس هوشمند خودرو؛ از خرید تا نگهداری",
            placeholder: "مثلاً: ماشینم صبح‌ها دیر روشن می‌شود...",
          },
    [mode],
  );

  async function sendMessage(text: string) {
    const content = text.trim().slice(0, 2_000);
    if (!content || sending) return;

    const userMessage: ChatMessage = {
      id: messageId("user"),
      role: "user",
      content,
    };
    const nextMessages = [...messages, userMessage].slice(-10);

    setMessages(nextMessages);
    setDraft("");
    setSending(true);
    setActions([]);
    setCards([]);
    setAnnounced("در حال آماده‌سازی پاسخ");

    try {
      const path = window.location.pathname;
      const currentMode: AssistantMode =
        path.startsWith("/admin") ? "admin" : "user";
      const location = loadHomeLocation() || DEFAULT_HOME_LOCATION;
      const sessionToken =
        currentMode === "admin"
          ? window.localStorage.getItem("chakod_session_token") || ""
          : "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
        headers["X-Session-Token"] = sessionToken;
      }

      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers,
        cache: "no-store",
        body: JSON.stringify({
          mode: currentMode,
          messages: nextMessages.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
          page: {
            path,
            title: document.title,
            locationLabel: location.label,
            locationProvince: location.province,
            locationCities: location.cities,
          },
        }),
      });
      const payload = (await readJson(response)) as AssistantResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          "message" in payload && payload.message
            ? payload.message
            : "پاسخ دستیار کامل نشد.",
        );
      }

      setMode(payload.mode);
      modeRef.current = payload.mode;
      setMessages((current) => [
        ...current,
        {
          id: messageId("assistant"),
          role: "assistant",
          content: payload.reply,
        },
      ]);
      setSuggestions(
        Array.isArray(payload.suggestions) && payload.suggestions.length
          ? payload.suggestions.slice(0, 4)
          : payload.mode === "admin"
            ? ADMIN_SUGGESTIONS
            : USER_SUGGESTIONS,
      );
      setActions(
        Array.isArray(payload.actions) ? payload.actions.slice(0, 4) : [],
      );
      setCards(Array.isArray(payload.cards) ? payload.cards.slice(0, 5) : []);
      setMeta({
        confidence: payload.confidence,
        data_status: payload.data_status,
        data_notice: payload.data_notice,
      });
      setAnnounced("پاسخ دستیار آماده شد");
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId("assistant-error"),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "ارتباط با دستیار برقرار نشد. دوباره امتحان کن.",
        },
      ]);
      setSuggestions(
        mode === "admin" ? ADMIN_SUGGESTIONS : USER_SUGGESTIONS,
      );
      setCards([]);
      setMeta({
        confidence: "low",
        data_status: "unavailable",
        data_notice: "ارتباط زنده برقرار نشد؛ دوباره امتحان کن.",
      });
      setAnnounced("پاسخ دستیار با خطا روبه‌رو شد");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(draft);
    }
  }

  function resetConversation() {
    setMessages([introMessage(mode)]);
    setSuggestions(mode === "admin" ? ADMIN_SUGGESTIONS : USER_SUGGESTIONS);
    setActions([]);
    setCards([]);
    setMeta(DEFAULT_META);
    setDraft("");
    clearConversation(mode);
    inputRef.current?.focus();
  }

  function toggleAssistant() {
    const path = window.location.pathname;
    const nextMode: AssistantMode =
      path.startsWith("/admin") ? "admin" : "user";

    if (modeRef.current !== nextMode) {
      restoreMode(nextMode);
    }

    setOpen((current) => !current);
  }

  return (
    <div className={styles.assistantRoot} data-chakod-ai="assistant">
      {open ? (
        <section
          ref={panelRef}
          className={styles.panel}
          role="dialog"
          aria-label={modeCopy.title}
          aria-modal="false"
          dir="rtl"
        >
          <header className={styles.header}>
            <div className={styles.identity}>
              <span className={styles.avatar} aria-hidden="true">
                ✦
              </span>
              <span>
                <strong>{modeCopy.title}</strong>
                <small>{modeCopy.subtitle}</small>
              </span>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={resetConversation}
                aria-label="شروع گفت‌وگوی جدید"
                title="گفت‌وگوی جدید"
              >
                ↻
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setOpen(false)}
                aria-label="بستن دستیار"
              >
                ×
              </button>
            </div>
          </header>

          <div className={styles.modeBar}>
            <span
              className={`${styles.liveDot} ${
                meta.data_status === "partial"
                  ? styles.partialDot
                  : meta.data_status === "unavailable"
                    ? styles.offlineDot
                    : ""
              }`}
              aria-hidden="true"
            />
            <span>
              {mode === "admin"
                ? "حالت مدیریت با دسترسی تأییدشده"
                : "همراه هوشمند در تمام صفحات چاکود"}
            </span>
            <em title={meta.data_notice}>
              {meta.data_status === "live"
                ? "داده زنده"
                : meta.data_status === "partial"
                  ? "داده محدود"
                  : "آماده بررسی"}
            </em>
          </div>

          <div className={styles.messages} aria-live="polite">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`${styles.message} ${
                  message.role === "user"
                    ? styles.userMessage
                    : styles.assistantMessage
                }`}
              >
                {message.role === "assistant" ? (
                  <span className={styles.messageMark} aria-hidden="true">
                    ✦
                  </span>
                ) : null}
                <p>{message.content}</p>
              </article>
            ))}

            {sending ? (
              <div
                className={`${styles.message} ${styles.assistantMessage} ${styles.typingMessage}`}
                aria-label="دستیار در حال پاسخ‌دادن است"
              >
                <span className={styles.messageMark} aria-hidden="true">
                  ✦
                </span>
                <span className={styles.typingDots} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            ) : null}

            <div ref={messageEndRef} />
          </div>

          {!sending && cards.length ? (
            <div className={styles.resultCards} aria-label="نتایج مستند دستیار">
              {cards.map((card) => (
                <a
                  key={`${card.kind}-${card.id}`}
                  className={styles.resultCard}
                  data-tone={card.tone}
                  href={card.href}
                >
                  <span className={styles.cardTopline}>
                    <strong>{card.title}</strong>
                    <small>{card.badge}</small>
                  </span>
                  {card.price_toman ? (
                    <b>{formatPrice(card.price_toman)}</b>
                  ) : null}
                  {card.facts.length ? (
                    <span className={styles.cardFacts}>
                      {card.facts.map((fact) => (
                        <i key={fact}>{fact}</i>
                      ))}
                    </span>
                  ) : null}
                </a>
              ))}
            </div>
          ) : null}

          {!sending && suggestions.length ? (
            <div className={styles.suggestions} aria-label="پیشنهادهای دستیار">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void sendMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          {!sending && actions.length ? (
            <nav className={styles.responseActions} aria-label="مسیرهای پیشنهادی">
              {actions.map((action) => (
                <a key={`${action.href}-${action.label}`} href={action.href}>
                  {action.label}
                  <span aria-hidden="true">←</span>
                </a>
              ))}
            </nav>
          ) : null}

          <form className={styles.composer} onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={modeCopy.placeholder}
              rows={1}
              maxLength={2_000}
              disabled={sending}
              aria-label="پیام شما به هوش چاکود"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="ارسال پیام"
            >
              <span aria-hidden="true">↑</span>
            </button>
          </form>

          <p className={styles.disclaimer}>
            {meta.data_notice} اطلاعات حساس نفرستید؛ پیشنهاد هوشمند جای بررسی
            کارشناس را نمی‌گیرد.
          </p>
          <span className={styles.srOnly} aria-live="polite">
            {announced}
          </span>
        </section>
      ) : null}

      <button
        type="button"
        className={`${styles.launcher} ${open ? styles.launcherOpen : ""}`}
        onClick={toggleAssistant}
        aria-expanded={open}
        aria-label={open ? "بستن هوش چاکود" : "بازکردن هوش چاکود"}
      >
        <span className={styles.launcherIcon} aria-hidden="true">
          ✦
        </span>
        <span className={styles.launcherText}>
          {mode === "admin" ? "هوش مدیریت" : "هوش چاکود"}
        </span>
      </button>
    </div>
  );
}

async function readJson(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("پاسخ دستیار قابل‌خواندن نبود.");
  }
}

function messageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type SavedConversation = {
  messages: ChatMessage[];
  suggestions: string[];
  actions: AssistantAction[];
  cards: AssistantResultCard[];
  meta: AssistantMeta;
};

function loadConversation(mode: AssistantMode): SavedConversation | null {
  try {
    const storage = mode === "admin" ? window.sessionStorage : window.localStorage;
    const raw = storage.getItem(conversationKey(mode));
    if (!raw) return null;
    const value = JSON.parse(raw) as {
      version?: unknown;
      savedAt?: unknown;
      state?: unknown;
    };

    if (
      value.version !== 2 ||
      typeof value.savedAt !== "number" ||
      !isSavedConversation(value.state)
    ) {
      storage.removeItem(conversationKey(mode));
      return null;
    }

    if (mode === "user" && Date.now() - value.savedAt > 24 * 60 * 60 * 1_000) {
      storage.removeItem(conversationKey(mode));
      return null;
    }

    return value.state;
  } catch {
    return null;
  }
}

function saveConversation(mode: AssistantMode, state: SavedConversation) {
  try {
    const storage = mode === "admin" ? window.sessionStorage : window.localStorage;
    storage.setItem(
      conversationKey(mode),
      JSON.stringify({
        version: 2,
        savedAt: Date.now(),
        state,
      }),
    );
  } catch {
    // Conversation persistence is optional when browser storage is unavailable.
  }
}

function clearConversation(mode: AssistantMode) {
  try {
    const storage = mode === "admin" ? window.sessionStorage : window.localStorage;
    storage.removeItem(conversationKey(mode));
  } catch {
    // Nothing else is required when storage is unavailable.
  }
}

function conversationKey(mode: AssistantMode) {
  return `chakod_ai_conversation_v2_${mode}`;
}

function isSavedConversation(value: unknown): value is SavedConversation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const state = value as Partial<SavedConversation>;

  return (
    Array.isArray(state.messages) &&
    state.messages.length > 0 &&
    state.messages.length <= 12 &&
    state.messages.every(
      (message) =>
        message &&
        typeof message.id === "string" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.length <= 4_500,
    ) &&
    Array.isArray(state.suggestions) &&
    state.suggestions.length <= 4 &&
    state.suggestions.every(
      (suggestion) =>
        typeof suggestion === "string" && suggestion.length <= 180,
    ) &&
    Array.isArray(state.actions) &&
    state.actions.length <= 4 &&
    state.actions.every(
      (action) =>
        action &&
        typeof action.label === "string" &&
        action.label.length <= 80 &&
        typeof action.href === "string" &&
        isSafeSavedHref(action.href),
    ) &&
    Array.isArray(state.cards) &&
    state.cards.length <= 5 &&
    state.cards.every(
      (card) =>
        card &&
        (card.kind === "listing" || card.kind === "admin_listing") &&
        Number.isInteger(card.id) &&
        typeof card.title === "string" &&
        card.title.length <= 220 &&
        typeof card.href === "string" &&
        isSafeSavedHref(card.href) &&
        Array.isArray(card.facts) &&
        card.facts.every(
          (fact) => typeof fact === "string" && fact.length <= 180,
        ),
    ) &&
    state.meta !== undefined &&
    (state.meta.confidence === "high" ||
      state.meta.confidence === "medium" ||
      state.meta.confidence === "low") &&
    (state.meta.data_status === "live" ||
      state.meta.data_status === "partial" ||
      state.meta.data_status === "unavailable") &&
    typeof state.meta.data_notice === "string" &&
    state.meta.data_notice.length <= 500
  );
}

function isSafeSavedHref(value: string) {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    value.length <= 500
  );
}

function formatPrice(value: number) {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("fa-IR", {
      maximumFractionDigits: 2,
    })} میلیارد تومان`;
  }

  return `${Math.round(value / 1_000_000).toLocaleString(
    "fa-IR",
  )} میلیون تومان`;
}
