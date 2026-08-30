const IS_STAGING_BROWSER =
  typeof window !== "undefined" && window.location.hostname === "staging.chakod.com";

export const PRELAUNCH_FIXTURES_ENABLED =
  process.env.NEXT_PUBLIC_PRELAUNCH_FIXTURES === "true" || IS_STAGING_BROWSER;

export const PRELAUNCH_SERVER_FIXTURES_ENABLED =
  process.env.PRELAUNCH_FIXTURES === "true" ||
  process.env.NEXT_PUBLIC_PRELAUNCH_FIXTURES === "true";

const ASSET_BASE = "https://staging.chakod.com";
const now = "2026-08-26T10:00:00.000Z";

export const PRELAUNCH_LISTINGS = ([
  [9100001, "TEST_ مرسدس بنز E200", "Mercedes-Benz", "E200", "luxury", "تهران", "تهران", 2023, 12500000000, "luxury-car.webp", 9200001, "TEST_ نمایشگاه آریا"],
  [9100002, "TEST_ بی‌ام‌و 530i", "BMW", "530i", "luxury", "البرز", "کرج", 2022, 10900000000, "luxury-car.webp", 9200001, "TEST_ نمایشگاه آریا"],
  [9100003, "TEST_ لکسوس NX300", "Lexus", "NX300", "luxury", "اصفهان", "اصفهان", 2021, 8750000000, "luxury-car.webp", 9200002, "TEST_ نمایشگاه ساحل"],
  [9100004, "TEST_ تویوتا لندکروزر", "Toyota", "Land Cruiser", "luxury", "فارس", "شیراز", 2020, 16800000000, "luxury-car.webp", 9200002, "TEST_ نمایشگاه ساحل"],
  [9100005, "TEST_ تویوتا راو 4 منطقه آزاد", "Toyota", "RAV4", "freezone", "گیلان", "بندر انزلی", 2022, 5200000000, "freezone-car.webp", 9200003, "TEST_ خودرو آزاد کاسپین"],
  [9100006, "TEST_ هیوندای سانتافه منطقه آزاد", "Hyundai", "Santa Fe", "freezone", "خوزستان", "آبادان", 2021, 4650000000, "freezone-car.webp", 9200003, "TEST_ خودرو آزاد کاسپین"],
  [9100007, "TEST_ کیا اسپورتیج منطقه آزاد", "Kia", "Sportage", "freezone", "هرمزگان", "قشم", 2023, 6100000000, "freezone-car.webp", 9200004, "TEST_ نمایشگاه خلیج"],
  [9100008, "TEST_ نیسان ایکس‌تریل منطقه آزاد", "Nissan", "X-Trail", "freezone", "آذربایجان شرقی", "جلفا", 2022, 5750000000, "freezone-car.webp", 9200004, "TEST_ نمایشگاه خلیج"],
  [9100009, "TEST_ پژو 207 اتوماتیک", "Peugeot", "207", "economic", "تهران", "تهران", 2024, 1180000000, "economic-car.webp", 0, ""],
  [9100010, "TEST_ دنا پلاس توربو", "Iran Khodro", "Dena Plus", "economic", "خراسان رضوی", "مشهد", 2023, 1260000000, "economic-car.webp", 0, ""],
  [9100011, "TEST_ شاهین اتوماتیک", "Saipa", "Shahin", "regular", "قم", "قم", 2023, 980000000, "economic-car.webp", 0, ""],
  [9100012, "TEST_ تارا V4", "Iran Khodro", "Tara V4", "regular", "مازندران", "ساری", 2024, 1390000000, "economic-car.webp", 0, ""],
] as const).map(([id, title, brand, model, segment, province, city, year, price, image, dealerId, dealerName], index) => ({
  id, title, brand, model, trim_name: "نسخه تست افتتاح", production_year: year,
  mileage_km: index % 3 === 0 ? 0 : (index + 1) * 4200, price_toman: price,
  province, city, neighborhood: "مرکز شهر", body_status: "clean", transmission: "automatic",
  fuel_type: index % 2 === 0 ? "gasoline" : "hybrid", color: index % 2 === 0 ? "مشکی" : "سفید",
  technical_condition: "سالم و آماده بازدید", price_is_negotiable: index % 2 === 1,
  seller_type: dealerId ? "dealer" : "personal", listing_owner_type: dealerId ? "dealer" : "personal",
  seller_display_name: dealerName || "فروشنده شخصی", dealer_name: dealerName || null,
  dealer_id: dealerId || null, dealer_slug: dealerId ? `test-showroom-${dealerId}` : null,
  dealer_verified: Boolean(dealerId), dealer_logo_url: dealerId ? `${ASSET_BASE}/test-avatars/dealer.webp` : null,
  category_code: "car", category_name: "خودرو سواری", created_at: now, updated_at: now,
  status: "published", description: `${title}؛ آگهی دمو برای معرفی امکانات چاکود. اطلاعات این آگهی آزمایشی است.`,
  market_segment: segment, cover_image: `${ASSET_BASE}/${image}`, views_count: 100 + index * 17,
  images: [
    { id: 9700001 + index * 2, image_url: `${ASSET_BASE}/${image}`, is_cover: true, sort_order: 0 },
    { id: 9700002 + index * 2, image_url: `${ASSET_BASE}/${image}`, is_cover: false, sort_order: 1 },
  ],
}));

export const PRELAUNCH_STORIES = PRELAUNCH_LISTINGS.slice(0, 8).map((listing, index) => ({
  story_id: 9300001 + index, listing_id: Number(listing.id), title: listing.title,
  brand: listing.brand, model: listing.model, year: listing.production_year,
  price_toman: listing.price_toman, province: listing.province, city: listing.city,
  neighborhood: listing.neighborhood, listing_owner_type: listing.dealer_id ? "dealer" : "personal",
  seller_display_name: listing.dealer_name || `TEST_ فروشنده ${index + 1}`,
  cover_image: { image_id: 9400001 + index, image_url: listing.cover_image },
  public_url: `/cars/${listing.id}`, media_type: "image", media_url: listing.cover_image,
  thumbnail_url: listing.cover_image, story_owner_key: `test-owner-${listing.dealer_id || index + 1}`,
  dealer_id: listing.dealer_id, starts_at: now, expires_at: null, is_active: true, demo_persistent: true,
}));

const PRELAUNCH_BUSINESS_COVER_URLS = {
  "demo-business-covers/detailing-01": "https://unsplash.com/photos/HNCSCpWrVJA/download?force=true",
  "demo-business-covers/car-wash-01": "https://unsplash.com/photos/eP8h7YVhFHk/download?force=true",
  "demo-business-covers/parts-01": "https://unsplash.com/photos/xe-e69j6-Ds/download?force=true",
  "demo-business-covers/battery-01": "https://unsplash.com/photos/ovGrEUgrkyE/download?force=true",
  "demo-business-covers/mechanic-01": "https://unsplash.com/photos/UZUzvJEvKnI/download?force=true",
  "demo-business-covers/electrical-01": "https://unsplash.com/photos/iFQpqbLMOFU/download?force=true",
  "demo-business-covers/ppf-01": "https://unsplash.com/photos/nDlIe54btMg/download?force=true",
  "demo-business-covers/tint-01": "https://unsplash.com/photos/8MXNZCgAah0/download?force=true",
  "demo-business-covers/wrap-01": "https://unsplash.com/photos/jlakazXU72w/download?force=true",
  "demo-business-covers/audio-01": "https://unsplash.com/photos/pWGUMQSWBwI/download?force=true",
  "demo-business-covers/car-wash-02": "https://unsplash.com/photos/Ng3xrviPrhk/download?force=true",
  "demo-business-covers/detailing-02": "https://unsplash.com/photos/8k_T1EwTySs/download?force=true",
  "demo-business-covers/parts-02": "https://unsplash.com/photos/9mxviB2BBOE/download?force=true",
  "demo-business-covers/parts-03": "https://unsplash.com/photos/i2kOA2p0DTo/download?force=true",
  "demo-business-covers/tire-01": "https://unsplash.com/photos/yeMpSqF8Z-8/download?force=true",
  "demo-business-covers/mechanic-02": "https://unsplash.com/photos/bEGTsOCnHro/download?force=true",
  "demo-business-covers/oil-change-01": "https://unsplash.com/photos/gW34cv-Ojjs/download?force=true",
  "demo-business-covers/electrical-02": "https://unsplash.com/photos/DPNfzltNOeQ/download?force=true",
} as const;

export const PRELAUNCH_BUSINESSES = ([
  [9500001, "car_service", "TEST_ دیتیلینگ سبز", "تهران", "تهران", "شهرک غرب", "سرامیک بدنه، صفرشویی و دیتیلینگ حرفه‌ای", ["دیتیلینگ", "سرامیک بدنه", "صفرشویی"], ["detailing", "ceramic_coating"], "demo-business-covers/detailing-01"],
  [9500002, "car_service", "TEST_ کارواش همراه سپید", "فارس", "شیراز", "معالی‌آباد", "کارواش، نظافت داخل کابین و خدمات سیار خودرو", ["کارواش", "خدمات سیار", "نظافت کابین"], ["car_wash"], "demo-business-covers/car-wash-01"],
  [9500003, "parts_store", "TEST_ یدک آریا", "البرز", "کرج", "گوهردشت", "قطعات مصرفی، فیلترها و لوازم جانبی خودرو", ["قطعات یدکی", "فیلتر", "لوازم جانبی"], ["spare_parts"], "demo-business-covers/parts-01"],
  [9500004, "parts_store", "TEST_ باتری و لاستیک شرق", "خراسان رضوی", "مشهد", "سجاد", "باتری، لاستیک، رینگ و لوازم مصرفی", ["باتری", "لاستیک", "رینگ"], ["spare_parts"], "demo-business-covers/battery-01"],
  [9500005, "repair_shop", "TEST_ تعمیرگاه دنا", "اصفهان", "اصفهان", "خانه اصفهان", "مکانیکی، سرویس دوره‌ای و تعویض روغن", ["مکانیکی", "سرویس دوره‌ای", "تعویض روغن"], ["mechanical", "oil_change"], "demo-business-covers/mechanic-01"],
  [9500006, "repair_shop", "TEST_ برق خودرو شمال", "مازندران", "ساری", "فرهنگ", "برق خودرو، دیاگ و تعمیر ECU", ["برق خودرو", "دیاگ", "ECU"], ["auto_electrical"], "demo-business-covers/electrical-01"],
  [9500007, "car_service", "TEST_ محافظ رنگ پایتخت", "تهران", "تهران", "پاسداران", "نصب محافظ رنگ PPF و پوشش‌های محافظ بدنه", ["محافظ رنگ PPF", "پولیش", "محافظ بدنه"], ["ppf"], "demo-business-covers/ppf-01"],
  [9500008, "car_service", "TEST_ شیشه دودی آفتاب", "آذربایجان شرقی", "تبریز", "ولیعصر", "شیشه دودی استاندارد، UV و خدمات نصب", ["شیشه دودی", "UV", "نصب تخصصی"], ["window_tint"], "demo-business-covers/tint-01"],
  [9500009, "car_service", "TEST_ کاور بدنه پارس", "فارس", "شیراز", "قصردشت", "کاور رنگی بدنه و تغییر ظاهر خودرو", ["کاور بدنه", "کاور رنگی", "طراحی ظاهری"], ["vehicle_wrap"], "demo-business-covers/wrap-01"],
  [9500010, "car_service", "TEST_ صوت و امنیت کارن", "خوزستان", "اهواز", "کیانپارس", "سیستم صوتی، مانیتور، دزدگیر و ردیاب", ["سیستم صوتی", "دزدگیر", "ردیاب"], ["audio_alarm"], "demo-business-covers/audio-01"],
  [9500011, "car_service", "TEST_ کارواش بخار کاسپین", "گیلان", "رشت", "گلسار", "کارواش بخار، موتورشویی و صفرشویی", ["کارواش", "بخارشویی", "صفرشویی"], ["car_wash"], "demo-business-covers/car-wash-02"],
  [9500012, "car_service", "TEST_ دیتیلینگ آبی", "هرمزگان", "بندرعباس", "گلشهر", "دیتیلینگ کامل، احیای رنگ و سرامیک بدنه", ["دیتیلینگ", "احیای رنگ", "سرامیک بدنه"], ["detailing", "ceramic_coating"], "demo-business-covers/detailing-02"],
  [9500013, "parts_store", "TEST_ قطعه بازار مرکزی", "تهران", "تهران", "چراغ برق", "قطعات موتوری، جلوبندی و مصرفی خودرو", ["قطعات موتوری", "جلوبندی", "قطعات مصرفی"], ["spare_parts"], "demo-business-covers/parts-02"],
  [9500014, "parts_store", "TEST_ یدک البرز", "قزوین", "قزوین", "مینودر", "لوازم یدکی خودروهای داخلی و وارداتی", ["لوازم یدکی", "قطعات وارداتی", "قطعات داخلی"], ["spare_parts"], "demo-business-covers/parts-03"],
  [9500015, "parts_store", "TEST_ رینگ و تایر ساحل", "گیلان", "بندر انزلی", "غازیان", "فروش تایر، رینگ و تجهیزات چرخ", ["لاستیک", "رینگ", "بالانس"], ["spare_parts"], "demo-business-covers/tire-01"],
  [9500016, "repair_shop", "TEST_ مکانیکی پایتخت", "تهران", "تهران", "تهرانپارس", "تعمیر موتور، گیربکس و سرویس دوره‌ای", ["مکانیکی", "موتور", "گیربکس"], ["mechanical"], "demo-business-covers/mechanic-02"],
  [9500017, "repair_shop", "TEST_ سرویس روغن سپهر", "قم", "قم", "سالاریه", "تعویض روغن، فیلتر و سرویس‌های دوره‌ای", ["تعویض روغن", "فیلتر", "سرویس دوره‌ای"], ["oil_change"], "demo-business-covers/oil-change-01"],
  [9500018, "repair_shop", "TEST_ برق و دیاگ خلیج", "هرمزگان", "قشم", "مرکز شهر", "برق خودرو، باتری، دیاگ و عیب‌یابی الکترونیکی", ["برق خودرو", "دیاگ", "باتری"], ["auto_electrical"], "demo-business-covers/electrical-02"],
] as const).map(([id, type, name, province, city, neighborhood, description, services, categoryKeys, coverKey]) => ({
  id, slug: `test-business-${id}`, business_type: type,
  business_type_title: type === "car_service" ? "خدمات خودرویی" : type === "parts_store" ? "لوازم یدکی" : "تعمیرگاه",
  name, province, city, neighborhood, address: `${city}، ${neighborhood}`,
  description, category_labels: [...services], services: [...services], category_keys: [...categoryKeys],
  logo_url: `${ASSET_BASE}/test-avatars/${type === "car_service" ? "car-service" : type === "parts_store" ? "parts-store" : "repair-shop"}.webp`,
  cover_url: PRELAUNCH_BUSINESS_COVER_URLS[coverKey],
  mobile_service: type === "car_service", price_range_text: "قیمت آزمایشی؛ استعلام در محل", is_verified: true,
  phone: null, whatsapp_phone: null, email: null, website_url: null, instagram_url: null,
  latitude: null, longitude: null, business_hours: [] as string[], gallery: [] as string[],
}));

export const PRELAUNCH_SHOWROOMS = ([
  { id: 9200001, slug: "test-showroom-9200001", business_type: "dealer", business_type_title: "نمایشگاه خودرو", name: "TEST_ نمایشگاه آریا", province: "تهران", city: "تهران", neighborhood: "سعادت‌آباد", address: "تهران، سعادت‌آباد", description: "نمایشگاه دمو خودروهای لوکس چاکود", logo_url: `${ASSET_BASE}/test-avatars/dealer.webp`, cover_url: `${ASSET_BASE}/luxury-car.webp`, category_labels: ["خودرو لوکس"], services: ["خرید و فروش خودرو"], business_hours: [], gallery: [], is_verified: true },
  { id: 9200002, slug: "test-showroom-9200002", business_type: "dealer", business_type_title: "نمایشگاه خودرو", name: "TEST_ نمایشگاه ساحل", province: "اصفهان", city: "اصفهان", neighborhood: "مرداویج", address: "اصفهان، مرداویج", description: "نمایشگاه دمو خودروهای منتخب چاکود", logo_url: `${ASSET_BASE}/test-avatars/dealer.webp`, cover_url: `${ASSET_BASE}/luxury-car.webp`, category_labels: ["خودرو لوکس"], services: ["خرید و فروش خودرو"], business_hours: [], gallery: [], is_verified: true },
  { id: 9200003, slug: "test-showroom-9200003", business_type: "dealer", business_type_title: "نمایشگاه خودرو", name: "TEST_ خودرو آزاد کاسپین", province: "گیلان", city: "بندر انزلی", neighborhood: "منطقه آزاد", address: "بندر انزلی، منطقه آزاد", description: "نمایشگاه دمو خودروهای منطقه آزاد", logo_url: `${ASSET_BASE}/test-avatars/dealer.webp`, cover_url: `${ASSET_BASE}/freezone-car.webp`, category_labels: ["منطقه آزاد"], services: ["خرید و فروش خودرو"], business_hours: [], gallery: [], is_verified: true },
  { id: 9200004, slug: "test-showroom-9200004", business_type: "dealer", business_type_title: "نمایشگاه خودرو", name: "TEST_ نمایشگاه خلیج", province: "هرمزگان", city: "قشم", neighborhood: "مرکز شهر", address: "قشم، مرکز شهر", description: "نمایشگاه دمو خودروهای منطقه آزاد خلیج فارس", logo_url: `${ASSET_BASE}/test-avatars/dealer.webp`, cover_url: `${ASSET_BASE}/freezone-car.webp`, category_labels: ["منطقه آزاد"], services: ["خرید و فروش خودرو"], business_hours: [], gallery: [], is_verified: true },
] as const).map((showroom) => ({
  phone: null, whatsapp_phone: null, email: null, website_url: null, instagram_url: null,
  latitude: null, longitude: null, mobile_service: false, price_range_text: "قیمت توافقی",
  ...showroom,
  category_labels: [...showroom.category_labels], services: [...showroom.services],
  business_hours: [] as string[], gallery: [] as string[],
}));

export const PRELAUNCH_MARKET_FLOOR = PRELAUNCH_LISTINGS.slice(0, 8).map((listing, index) => ({
  id: 9600001 + index, score: 98 - index * 3, province: listing.province,
  reason: "TEST_ امتیاز آزمایشی کف بازار", cycleEndsAt: null, demoPersistent: true,
  listing: { id: listing.id, title: listing.title, brand: listing.brand, model: listing.model,
    year: listing.production_year, mileageKm: listing.mileage_km, priceToman: listing.price_toman,
    coverUrl: listing.cover_image, publicUrl: `/cars/${listing.id}` },
}));
