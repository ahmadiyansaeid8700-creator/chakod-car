import type {
  AdminListingContext,
  AssistantAction,
  AssistantIntent,
  AssistantKnowledge,
  AssistantMessage,
  AssistantReply,
  AssistantResultCard,
  PublicListingContext,
  PublicSearchIntent,
} from "./contracts";

export type OfflineFallbackReason =
  | "cloud_not_configured"
  | "cloud_unavailable";

const SENSITIVE_INPUT_PATTERN =
  /(رمز(?:\s*عبور)?|پسورد|کد\s*(?:پیامکی|تأیید|ورود)|otp|توکن|token|cvv2|شماره\s*کارت|اطلاعات\s*کارت)/i;

const COMPARISON_PATTERN = /(مقایسه|فرق|تفاوت|کدام\s*بهتر)/;
const PRICE_PATTERN =
  /(قیمت|ارزش|منصفانه|گران|ارزان|میانه|بازار|بودجه)/;
const SELLING_PATTERN =
  /(ثبت\s*آگهی|فروش\s*خودرو|آگهی\s*جدید|عنوان\s*آگهی|عکس\s*آگهی|توضیحات\s*آگهی|ویرایش\s*آگهی)/;
const LISTING_STATUS_PATTERN =
  /(وضعیت\s*آگهی|رد\s*شد|ردشده|منقضی|نیازمند\s*اصلاح|در\s*انتظار\s*بررسی|گزارش\s*آگهی)/;
const VEHICLE_SEARCH_PATTERN =
  /(خودرو|ماشین|اتومبیل|بخرم|خرید|پیشنهاد|مدل|کارکرد|اتومات|دنده|هیبرید|برقی|بنزینی|میلیارد|میلیون)/;
const ADMIN_QUEUE_PATTERN =
  /(صف|ریسک|معطل|نیازمند\s*پیگیری|اولویت|بررسی\s*آگهی)/;
const ADMIN_OPERATIONS_PATTERN =
  /(وضعیت\s*(?:امروز|سایت)|گزارش|عملکرد|آمار|برنامه\s*امروز|فشار\s*کاری)/;

export function buildOfflineAssistantReply(
  messages: AssistantMessage[],
  knowledge: AssistantKnowledge,
  reason: OfflineFallbackReason = "cloud_not_configured",
): AssistantReply {
  const message = normalizeText(messages.at(-1)?.content || "");

  if (SENSITIVE_INPUT_PATTERN.test(message)) {
    return sensitiveInformationReply(knowledge.mode, reason);
  }

  const intent = detectOfflineIntent(message, knowledge.mode);

  return knowledge.mode === "admin"
    ? buildAdminReply(intent, knowledge, reason)
    : buildUserReply(intent, knowledge, reason);
}

export function detectOfflineIntent(
  message: string,
  mode: AssistantKnowledge["mode"],
): AssistantIntent {
  const normalized = normalizeText(message);

  if (mode === "admin") {
    if (ADMIN_QUEUE_PATTERN.test(normalized)) return "moderation_queue";
    if (ADMIN_OPERATIONS_PATTERN.test(normalized)) return "site_operations";
    return "general";
  }

  if (COMPARISON_PATTERN.test(normalized)) return "listing_comparison";
  if (LISTING_STATUS_PATTERN.test(normalized)) return "listing_review";
  if (SELLING_PATTERN.test(normalized)) return "selling_help";
  if (PRICE_PATTERN.test(normalized) && VEHICLE_SEARCH_PATTERN.test(normalized)) {
    return "price_analysis";
  }
  if (VEHICLE_SEARCH_PATTERN.test(normalized)) return "vehicle_search";
  return "general";
}

function buildUserReply(
  intent: AssistantIntent,
  knowledge: Extract<AssistantKnowledge, { mode: "user" }>,
  reason: OfflineFallbackReason,
): AssistantReply {
  const dataState = userDataState(knowledge);

  if (intent === "selling_help") {
    return baseReply({
      mode: "user",
      intent,
      confidence: "high",
      dataStatus: dataState.status,
      dataNotice: offlineNotice(reason, dataState.notice),
      reply:
        "برای ثبت آگهی کامل، ابتدا مشخصات دقیق خودرو را وارد کن، سپس عکس‌های روشن از زوایای مختلف بگذار، قیمت و محل را بررسی کن و پیش از ارسال، پیش‌نمایش را بخوان. هیچ اطلاعات تماس یا ادعای تأییدنشده‌ای را داخل توضیحات ننویس.",
      suggestions: [
        "چه عکس‌هایی برای آگهی لازم است؟",
        "عنوان آگهی را چطور بهتر بنویسم؟",
        "چرا آگهی نیازمند اصلاح می‌شود؟",
      ],
      actions: [
        { label: "ثبت آگهی خودرو", href: "/account/listings/new" },
        { label: "آگهی‌های من", href: "/account/listings" },
      ],
    });
  }

  if (intent === "listing_review") {
    return baseReply({
      mode: "user",
      intent,
      confidence: "high",
      dataStatus: dataState.status,
      dataNotice: offlineNotice(reason, dataState.notice),
      reply:
        "وضعیت هر آگهی را از بخش «آگهی‌های من» بررسی کن. اگر آگهی رد یا نیازمند اصلاح باشد، علت ثبت‌شده را بخوان، فقط همان موارد را اصلاح کن و دوباره برای بررسی بفرست. برای آگهی منقضی یا فروخته‌شده از همان صفحه مدیریت اقدام کن.",
      suggestions: [
        "علت رد آگهی را کجا ببینم؟",
        "چطور آگهی را ویرایش کنم؟",
        "چطور خودرو را فروخته‌شده بزنم؟",
      ],
      actions: [{ label: "مدیریت آگهی‌های من", href: "/account/listings" }],
    });
  }

  if (intent === "listing_comparison") {
    const listings = knowledge.catalog.listings.slice(0, 2);
    const hasTwoListings = listings.length >= 2;

    return baseReply({
      mode: "user",
      intent,
      confidence: hasTwoListings ? "medium" : "low",
      dataStatus: dataState.status,
      dataNotice: offlineNotice(reason, dataState.notice),
      reply: hasTwoListings
        ? `دو گزینه واقعی از داده فعلی چاکود پیدا شد: «${listings[0].title}» و «${listings[1].title}». مقایسه را روی سال، کارکرد، قیمت درخواستی، وضعیت بدنه و نوع فروشنده انجام بده؛ نتیجه نهایی به بازدید، کارشناسی فنی و بررسی مدارک نیاز دارد.`
        : "برای مقایسه مطمئن، دست‌کم دو آگهی واقعی لازم است. ابتدا بازار خودرو را با فیلترهای مدنظرت باز کن و دو گزینه را انتخاب کن.",
      suggestions: [
        "سال و کارکرد کدام مهم‌تر است؟",
        "قیمت درخواستی را چطور مقایسه کنم؟",
        "چه چیزهایی را حضوری بررسی کنم؟",
      ],
      actions: [
        { label: "مشاهده نتایج بازار", href: searchHref(knowledge.catalog.query) },
      ],
      cards: buildUserCards(listings, knowledge.market.median_price_toman),
    });
  }

  if (intent === "price_analysis") {
    const market = knowledge.market;
    const hasPrices =
      market.priced_sample_size > 0 && market.median_price_toman !== null;
    const positionText = positionLabel(market.current_listing_position);

    return baseReply({
      mode: "user",
      intent,
      confidence: hasPrices ? "medium" : "low",
      dataStatus: dataState.status,
      dataNotice: offlineNotice(reason, dataState.notice),
      reply: hasPrices
        ? `در نمونه فعلی چاکود، ${toFaNumber(market.priced_sample_size)} آگهی قیمت‌دار وجود دارد و میانه قیمت‌های درخواستی ${formatToman(market.median_price_toman)} است. ${positionText} این عدد قیمت قطعی معامله یا تضمین ارزش خودرو نیست و باید با وضعیت فنی، بدنه، مدارک و کارشناسی مقایسه شود.`
        : "برای تحلیل قیمت، داده قیمت‌دار کافی از API رسمی چاکود در دسترس نیست. از ساختن عدد یا قیمت تقریبی خودداری می‌کنم؛ فیلترها را محدودتر کن یا بعداً دوباره بررسی کن.",
      suggestions: [
        "بازه قیمت را محدودتر کن",
        "کارکرد و سال را هم در نظر بگیر",
        "هزینه کارشناسی را فراموش نکن",
      ],
      actions: [
        { label: "بررسی آگهی‌های مشابه", href: searchHref(knowledge.catalog.query) },
      ],
      cards: buildUserCards(
        knowledge.catalog.listings.slice(0, 3),
        market.median_price_toman,
      ),
    });
  }

  if (intent === "vehicle_search") {
    const listings = knowledge.catalog.listings.slice(0, 3);
    const hasListings = listings.length > 0;
    const filterSummary = describeFilters(knowledge.catalog.query);

    return baseReply({
      mode: "user",
      intent,
      confidence: hasListings ? "medium" : "low",
      dataStatus: dataState.status,
      dataNotice: offlineNotice(reason, dataState.notice),
      reply: hasListings
        ? `${toFaNumber(knowledge.catalog.total || listings.length)} نتیجه در داده فعلی چاکود بررسی شد${filterSummary ? ` با فیلتر ${filterSummary}` : ""}. چند گزینه واقعی را پایین می‌بینی؛ قبل از خرید، آگهی، هویت فروشنده، مدارک و وضعیت فنی خودرو را حضوری بررسی کن.`
        : `برای این درخواست نتیجه زنده قابل اتکایی پیدا نشد${filterSummary ? ` با فیلتر ${filterSummary}` : ""}. فیلترها را بازتر کن یا مستقیماً وارد بازار خودرو شو؛ من اطلاعات یا موجودی ساختگی تولید نمی‌کنم.`,
      suggestions: [
        "بودجه و شهر را دقیق‌تر بگو",
        "حداکثر کارکرد را مشخص کن",
        "گیربکس یا برند را انتخاب کن",
      ],
      actions: [
        { label: "بازکردن نتایج خودرو", href: searchHref(knowledge.catalog.query) },
        { label: "خودروهای لوکس", href: "/cars/luxury" },
        { label: "خودروهای منطقه آزاد", href: "/cars/free-zone" },
      ],
      cards: buildUserCards(listings, knowledge.market.median_price_toman),
    });
  }

  return baseReply({
    mode: "user",
    intent: "general",
    confidence: "high",
    dataStatus: dataState.status,
    dataNotice: offlineNotice(reason, dataState.notice),
    reply:
      "در حالت مستقل می‌توانم تو را به جست‌وجوی خودرو، ثبت و مدیریت آگهی، کسب‌وکارهای خودرویی و پشتیبانی هدایت کنم. برای پاسخ دقیق‌تر، موضوع را کوتاه و مشخص بنویس؛ مثلاً بودجه و شهر یا مشکلی که هنگام ثبت آگهی داری.",
    suggestions: [
      "تا ۲ میلیارد چه خودرویی پیدا می‌شود؟",
      "برای ثبت آگهی راهنمایی‌ام کن",
      "وضعیت آگهی‌ام را کجا ببینم؟",
    ],
    actions: [
      { label: "بازار خودرو", href: "/cars" },
      { label: "ثبت آگهی", href: "/account/listings/new" },
      { label: "کسب‌وکارهای خودرویی", href: "/businesses" },
      { label: "پشتیبانی", href: "/support" },
    ],
  });
}

function buildAdminReply(
  intent: AssistantIntent,
  knowledge: Extract<AssistantKnowledge, { mode: "admin" }>,
  reason: OfflineFallbackReason,
): AssistantReply {
  const dataState = adminDataState(knowledge);
  const insights = knowledge.operations.insights;
  const queue = knowledge.operations.attention_queue.slice(0, 3);
  const hasOperationalData =
    knowledge.operations.data_status !== "unavailable";

  const reply = hasOperationalData
    ? `بر پایه داده رسمی قابل‌دسترسی: ${toFaNumber(knowledge.operations.pending_total)} آگهی در انتظار، ${toFaNumber(insights.critical_total)} مورد با ریسک بالا، ${toFaNumber(insights.stale_total)} مورد بیش از سه روز در صف و ${toFaNumber(insights.needs_edit_total)} مورد نیازمند اصلاح ثبت شده است. این جمع‌بندی فقط برای اولویت‌بندی بررسی انسانی است و هیچ تأیید، رد، حذف یا انتشار خودکاری انجام نمی‌شود.`
    : "داده عملیاتی مدیریت در دسترس نیست. در حالت مستقل هیچ آمار، ریسک یا تصمیم مدیریتی را حدس نمی‌زنم. از پنل مدیریت وضعیت را بررسی کن و پس از بازگشت API دوباره سؤال بپرس.";

  return baseReply({
    mode: "admin",
    intent:
      intent === "moderation_queue" ? "moderation_queue" : "site_operations",
    confidence: hasOperationalData ? "medium" : "low",
    dataStatus: dataState.status,
    dataNotice: offlineNotice(reason, dataState.notice),
    reply,
    suggestions: [
      "موارد پرریسک را اول بررسی کن",
      "آگهی‌های معطل را جدا کن",
      "دلیل اصلاح را شفاف ثبت کن",
    ],
    actions: [
      { label: "صف مدیریت آگهی‌ها", href: "/admin/listings" },
      { label: "داشبورد مدیریت", href: "/admin" },
    ],
    cards: buildAdminCards(queue),
  });
}

function sensitiveInformationReply(
  mode: AssistantKnowledge["mode"],
  reason: OfflineFallbackReason,
): AssistantReply {
  return baseReply({
    mode,
    intent: "general",
    confidence: "high",
    dataStatus: "unavailable",
    dataNotice: offlineNotice(
      reason,
      "اطلاعات حساس برای پردازش دریافت یا ذخیره نمی‌شود.",
    ),
    reply:
      "رمز عبور، کد پیامکی، توکن، شماره کارت یا اطلاعات پرداخت را در گفتگو نفرست. دستیار چاکود این اطلاعات را درخواست نمی‌کند. برای ورود فقط از صفحه رسمی ورود و برای مشکل حساب از پشتیبانی استفاده کن.",
    suggestions: ["مشکل ورود دارم", "به پشتیبانی نیاز دارم"],
    actions: [
      { label: "ورود امن", href: "/login" },
      { label: "پشتیبانی", href: "/support" },
    ],
  });
}

function baseReply({
  mode,
  intent,
  confidence,
  dataStatus,
  dataNotice,
  reply,
  suggestions,
  actions,
  cards = [],
}: {
  mode: AssistantKnowledge["mode"];
  intent: AssistantIntent;
  confidence: AssistantReply["confidence"];
  dataStatus: AssistantReply["data_status"];
  dataNotice: string;
  reply: string;
  suggestions: string[];
  actions: AssistantAction[];
  cards?: AssistantResultCard[];
}): AssistantReply {
  return {
    success: true,
    configured: false,
    mode,
    intent,
    confidence,
    data_status: dataStatus,
    data_notice: dataNotice,
    reply,
    suggestions: suggestions.slice(0, 4),
    actions: actions.filter((action) => isSafeInternalHref(action.href)).slice(0, 4),
    cards: cards.slice(0, 5),
  };
}

function userDataState(
  knowledge: Extract<AssistantKnowledge, { mode: "user" }>,
) {
  if (knowledge.catalog.data_status === "ready") {
    return {
      status: "live" as const,
      notice: "نتیجه فقط از داده زنده API رسمی چاکود ساخته شده است.",
    };
  }

  if (knowledge.catalog.listings.length) {
    return {
      status: "partial" as const,
      notice: "فقط بخشی از داده رسمی چاکود در دسترس بود.",
    };
  }

  return {
    status: "unavailable" as const,
    notice: "داده زنده بازار در دسترس نبود؛ پاسخ به راهنمایی ثابت محدود است.",
  };
}

function adminDataState(
  knowledge: Extract<AssistantKnowledge, { mode: "admin" }>,
) {
  if (knowledge.operations.data_status === "ready") {
    return {
      status: "live" as const,
      notice: "جمع‌بندی فقط از داده زنده و مجاز پنل مدیریت ساخته شده است.",
    };
  }

  if (knowledge.operations.data_status === "partial") {
    return {
      status: "partial" as const,
      notice: "بخشی از داده مجاز مدیریت در دسترس بود.",
    };
  }

  return {
    status: "unavailable" as const,
    notice: "داده مدیریت در دسترس نبود و هیچ آماری حدس زده نشد.",
  };
}

function offlineNotice(reason: OfflineFallbackReason, dataNotice: string) {
  const modeNotice =
    reason === "cloud_unavailable"
      ? "مدل ابری موقتاً پاسخ نداد؛ هسته مستقل فعال شد."
      : "هسته مستقل بدون مدل ابری فعال است.";
  return `${modeNotice} ${dataNotice}`;
}

function searchHref(query: PublicSearchIntent) {
  const params = new URLSearchParams();

  setParam(params, "q", query.q);
  setParam(params, "brand", query.brand);
  setParam(params, "model", query.model);
  setParam(params, "province", query.province);
  setParam(params, "city", query.city);
  setNumberParam(params, "price_min", query.min_price);
  setNumberParam(params, "price_max", query.max_price);
  setParam(params, "seller_type", query.seller_type);

  const value = params.toString();
  return value ? `/cars?${value}` : "/cars";
}

function describeFilters(query: PublicSearchIntent) {
  return [
    query.brand,
    query.model,
    query.province,
    query.city,
    query.max_price ? `تا ${formatToman(query.max_price)}` : "",
    query.min_price ? `از ${formatToman(query.min_price)}` : "",
  ]
    .filter(Boolean)
    .join("، ");
}

function buildUserCards(
  listings: PublicListingContext[],
  median: number | null,
): AssistantResultCard[] {
  return listings.slice(0, 5).map((listing) => {
    const price = listing.price_toman;
    const position =
      !price || !median
        ? { badge: "نیازمند بررسی قیمت", tone: "neutral" as const }
        : price < median * 0.88
          ? { badge: "کمتر از میانه نمونه", tone: "good" as const }
          : price > median * 1.12
            ? { badge: "بالاتر از میانه نمونه", tone: "warning" as const }
            : { badge: "نزدیک میانه نمونه", tone: "neutral" as const };

    return {
      kind: "listing",
      id: listing.id,
      title: listing.title,
      href: safeListingHref(listing.href, listing.id),
      price_toman: listing.price_toman,
      badge: position.badge,
      tone: position.tone,
      facts: [
        listing.year ? `مدل ${toFaNumber(listing.year)}` : "",
        listing.mileage_km !== null
          ? `${toFaNumber(listing.mileage_km)} کیلومتر`
          : "",
        listing.location,
      ]
        .filter(Boolean)
        .slice(0, 3),
    };
  });
}

function buildAdminCards(
  listings: AdminListingContext[],
): AssistantResultCard[] {
  return listings.slice(0, 5).map((listing) => {
    const risk = listing.risk_level;
    const tone =
      risk === "critical" || risk === "high"
        ? "danger"
        : risk === "medium"
          ? "warning"
          : risk === "low"
            ? "good"
            : "neutral";

    return {
      kind: "admin_listing",
      id: listing.id,
      title: listing.title,
      href: safeListingHref(listing.href, listing.id),
      price_toman: null,
      badge: listing.priority_reasons[0] || "نیازمند بررسی انسانی",
      tone,
      facts: [
        listing.age_days !== null
          ? `${toFaNumber(listing.age_days)} روز در صف`
          : "",
        listing.moderation_reason,
      ]
        .filter(Boolean)
        .slice(0, 3),
    };
  });
}

function positionLabel(
  position: Extract<
    AssistantKnowledge,
    { mode: "user" }
  >["market"]["current_listing_position"],
) {
  if (position === "below_market") {
    return "قیمت آگهی بازشده پایین‌تر از میانه همین نمونه است؛ این اختلاف می‌تواند نیازمند بررسی بیشتر باشد.";
  }
  if (position === "above_market") {
    return "قیمت آگهی بازشده بالاتر از میانه همین نمونه است.";
  }
  if (position === "near_market") {
    return "قیمت آگهی بازشده نزدیک میانه همین نمونه است.";
  }
  return "برای جایگاه قیمت آگهی بازشده داده کافی وجود ندارد.";
}

function isSafeInternalHref(href: string) {
  if (!href.startsWith("/") || href.startsWith("//") || href.length > 500) {
    return false;
  }

  return (
    /^\/cars(?:\/[^?#]+)?(?:[/?#]|$)/.test(href) ||
    /^\/account\/listings(?:[/?#]|$)/.test(href) ||
    /^\/businesses(?:[/?#]|$)/.test(href) ||
    /^\/support(?:[/?#]|$)/.test(href) ||
    /^\/login(?:[/?#]|$)/.test(href) ||
    /^\/admin(?:\/listings)?(?:[/?#]|$)/.test(href)
  );
}

function safeListingHref(href: string, id: number) {
  return /^\/cars\/[^/?#]+(?:[/?#]|$)/.test(href) ? href : `/cars/${id}`;
}

function setParam(params: URLSearchParams, key: string, value: string) {
  const clean = value.trim();
  if (clean) params.set(key, clean);
}

function setNumberParam(
  params: URLSearchParams,
  key: string,
  value: number | null,
) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    params.set(key, String(Math.round(value)));
  }
}

function formatToman(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "نامشخص";
  return `${toFaNumber(Math.round(value))} تومان`;
}

function toFaNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f\u202a-\u202e]/g, " ")
    .replace(/\s+/g, " ");
}
