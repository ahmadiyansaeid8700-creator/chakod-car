import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOfflineAssistantReply,
  detectOfflineIntent,
} from "../lib/ai-assistant/offline.ts";

const publicKnowledge = {
  mode: "user",
  page: {
    path: "/cars",
    title: "بازار خودرو",
    locationProvince: "گیلان",
    locationCities: ["رشت"],
  },
  catalog: {
    total: 2,
    query: {
      q: "",
      province: "گیلان",
      city: "رشت",
      brand: "تویوتا",
      model: "",
      min_price: null,
      max_price: 2_000_000_000,
      min_year: null,
      max_year: null,
      max_mileage: null,
      transmission: "automatic",
      fuel_type: "",
      seller_type: "",
      sort: "vip",
      relaxed: false,
    },
    listings: [
      {
        id: 11,
        title: "تویوتا کرولا مدل ۲۰۱۸",
        brand: "تویوتا",
        model: "کرولا",
        year: 2018,
        mileage_km: 72_000,
        price_toman: 1_900_000_000,
        location: "گیلان، رشت",
        body_status: "بدون رنگ",
        transmission: "automatic",
        fuel_type: "gasoline",
        seller_type: "personal",
        views_count: 120,
        href: "/cars/11",
      },
      {
        id: 12,
        title: "تویوتا یاریس مدل ۲۰۱۷",
        brand: "تویوتا",
        model: "یاریس",
        year: 2017,
        mileage_km: 88_000,
        price_toman: 1_700_000_000,
        location: "گیلان، رشت",
        body_status: "یک لکه رنگ",
        transmission: "automatic",
        fuel_type: "gasoline",
        seller_type: "dealer",
        views_count: 95,
        href: "/cars/12",
      },
    ],
    detail: null,
    data_status: "ready",
  },
  market: {
    sample_size: 2,
    priced_sample_size: 2,
    median_price_toman: 1_800_000_000,
    min_price_toman: 1_700_000_000,
    max_price_toman: 1_900_000_000,
    affordable_count: 2,
    current_listing_position: "unknown",
  },
};

const adminKnowledge = {
  mode: "admin",
  page: { path: "/admin", title: "مدیریت" },
  admin: {
    display_name: "مدیر چاکود",
    role: "owner",
    permissions: ["*"],
  },
  operations: {
    stats: { pending: 8, needs_edit: 3 },
    pending_total: 8,
    approved_total: 41,
    attention_queue: [
      {
        id: 91,
        title: "آگهی نیازمند بررسی",
        status: "pending",
        moderation_status: "review",
        risk_level: "high",
        risk_score: 82,
        moderation_reason: "قیمت نیازمند بررسی انسانی است",
        owner_type: "personal",
        created_at: "2026-08-01T10:00:00Z",
        age_days: 4,
        href: "/cars/91",
        priority_score: 640,
        priority_reasons: ["ریسک بالا", "بیش از ۳ روز در صف"],
      },
    ],
    recently_approved: [],
    insights: {
      risk_counts: { high: 1 },
      age_buckets: { fresh: 0, waiting: 0, stale: 1 },
      owner_type_counts: { personal: 1 },
      critical_total: 1,
      stale_total: 1,
      needs_edit_total: 3,
      workload_score: 70,
    },
    data_status: "ready",
  },
};

test("offline intent detection recognizes core user tasks", () => {
  assert.equal(detectOfflineIntent("سلام خوبی؟", "user"), "social_greeting");
  assert.equal(
    detectOfflineIntent("چه روغنی برای ماشینم بریزم؟", "user"),
    "vehicle_maintenance",
  );
  assert.equal(
    detectOfflineIntent("ماشین موقع استارت لرزش دارد", "user"),
    "vehicle_diagnostics",
  );
  assert.equal(
    detectOfflineIntent("برای ثبت آگهی راهنمایی‌ام کن", "user"),
    "selling_help",
  );
  assert.equal(
    detectOfflineIntent("این دو ماشین را مقایسه کن", "user"),
    "listing_comparison",
  );
  assert.equal(
    detectOfflineIntent("تا دو میلیارد چه ماشینی بخرم؟", "user"),
    "vehicle_search",
  );
  assert.equal(
    detectOfflineIntent("چطور تعمیرگاهم را ثبت کنم؟", "user"),
    "business_setup",
  );
});

test("offline automotive expert greets naturally and asks before guessing specs", () => {
  const greeting = buildOfflineAssistantReply(
    [{ role: "user", content: "سلام خوبی؟" }],
    publicKnowledge,
  );
  const maintenance = buildOfflineAssistantReply(
    [{ role: "user", content: "چه روغنی برای ماشینم خوبه؟" }],
    publicKnowledge,
  );

  assert.equal(greeting.intent, "social_greeting");
  assert.match(greeting.reply, /خوش اومدی|حالت چطوره/);
  assert.equal(maintenance.intent, "vehicle_maintenance");
  assert.match(maintenance.reply, /مدل/);
  assert.match(maintenance.reply, /سال/);
  assert.match(maintenance.reply, /تیپ|موتور/);
});

test("offline diagnostics highlights urgent automotive safety risks", () => {
  const reply = buildOfflineAssistantReply(
    [{ role: "user", content: "چراغ روغن روشن شده و ماشین داغ می‌کند" }],
    publicKnowledge,
  );

  assert.equal(reply.intent, "vehicle_diagnostics");
  assert.match(reply.reply, /رانندگی نکن/);
  assert.ok(reply.actions.some((action) => action.href === "/businesses"));
});

test("offline vehicle search only returns canonical actions and real cards", () => {
  const reply = buildOfflineAssistantReply(
    [{ role: "user", content: "تا دو میلیارد در رشت تویوتا پیشنهاد بده" }],
    publicKnowledge,
  );

  assert.equal(reply.success, true);
  assert.equal(reply.configured, false);
  assert.equal(reply.data_status, "live");
  assert.equal(reply.cards.length, 2);
  assert.deepEqual(
    reply.cards.map((card) => card.id),
    [11, 12],
  );
  assert.ok(reply.actions[0].href.startsWith("/cars?"));
  assert.ok(reply.actions[0].href.includes("province="));
  assert.ok(reply.actions.every((action) => action.href.startsWith("/")));
});

test("offline selling help leads to the canonical account listing flow", () => {
  const reply = buildOfflineAssistantReply(
    [{ role: "user", content: "چطور آگهی جدید ثبت کنم؟" }],
    publicKnowledge,
  );

  assert.equal(reply.intent, "selling_help");
  assert.deepEqual(
    reply.actions.map((action) => action.href),
    ["/account/listings/new", "/account/listings"],
  );
});

test("offline business setup leads to the native business workflow", () => {
  const reply = buildOfflineAssistantReply(
    [{ role: "user", content: "چطور فروشگاه قطعاتم را ثبت کنم؟" }],
    publicKnowledge,
  );

  assert.equal(reply.intent, "business_setup");
  assert.deepEqual(
    reply.actions.map((action) => action.href),
    ["/account/business/new", "/account/business", "/businesses"],
  );
  assert.match(reply.reply, /بررسی مدیریت/);
});

test("offline admin summary uses supplied data and never exposes automatic actions", () => {
  const reply = buildOfflineAssistantReply(
    [{ role: "user", content: "صف آگهی‌های پرریسک را اولویت‌بندی کن" }],
    adminKnowledge,
    "cloud_unavailable",
  );

  assert.equal(reply.mode, "admin");
  assert.equal(reply.intent, "moderation_queue");
  assert.equal(reply.cards[0].id, 91);
  assert.match(reply.reply, /بررسی انسانی/);
  assert.match(reply.data_notice, /هسته مستقل فعال شد/);
  assert.ok(
    reply.actions.every((action) =>
      ["/admin", "/admin/listings"].includes(action.href),
    ),
  );
});

test("offline core refuses sensitive authentication and payment data", () => {
  const reply = buildOfflineAssistantReply(
    [{ role: "user", content: "کد پیامکی و شماره کارت را کجا بفرستم؟" }],
    publicKnowledge,
  );

  assert.match(reply.reply, /نفرست/);
  assert.deepEqual(
    reply.actions.map((action) => action.href),
    ["/login", "/support"],
  );
});
