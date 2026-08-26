export const PRELAUNCH_FIXTURES_ENABLED =
  process.env.NEXT_PUBLIC_PRELAUNCH_FIXTURES === "true";

const ASSET_BASE = "https://staging.chakod.com";
const now = "2026-08-26T10:00:00.000Z";

export const PRELAUNCH_LISTINGS = [
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
].map(([id, title, brand, model, segment, province, city, year, price, image, dealerId, dealerName], index) => ({
  id, title, brand, model, trim_name: "نسخه تست افتتاح", production_year: year,
  mileage_km: index % 3 === 0 ? 0 : (index + 1) * 4200, price_toman: price,
  province, city, neighborhood: "مرکز شهر", body_status: "clean", transmission: "automatic",
  seller_type: dealerId ? "dealer" : "personal", dealer_name: dealerName || null,
  dealer_id: dealerId || null, dealer_slug: dealerId ? `test-showroom-${dealerId}` : null,
  dealer_verified: Boolean(dealerId), dealer_logo_url: dealerId ? `${ASSET_BASE}/test-avatars/dealer.webp` : null,
  category_code: "car", category_name: "خودرو سواری", created_at: now,
  market_segment: segment, cover_image: `${ASSET_BASE}/${image}`, views_count: 100 + index * 17,
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
  dealer_id: listing.dealer_id, expires_at: "2027-01-01T00:00:00.000Z",
}));

export const PRELAUNCH_BUSINESSES = [
  [9500001, "car_service", "TEST_ دیتیلینگ سبز", "تهران", "تهران", "شهرک غرب", "سرامیک بدنه، صفرشویی و دیتیلینگ", ["دیتیلینگ", "سرامیک"]],
  [9500002, "car_service", "TEST_ کارواش همراه سپید", "فارس", "شیراز", "معالی‌آباد", "کارواش و خدمات سیار خودرو", ["کارواش", "خدمات سیار"]],
  [9500003, "parts_store", "TEST_ یدک آریا", "البرز", "کرج", "گوهردشت", "قطعات مصرفی و لوازم جانبی", ["قطعات", "لوازم جانبی"]],
  [9500004, "parts_store", "TEST_ باتری و لاستیک شرق", "خراسان رضوی", "مشهد", "سجاد", "باتری، لاستیک و رینگ", ["باتری", "لاستیک"]],
  [9500005, "repair_shop", "TEST_ تعمیرگاه دنا", "اصفهان", "اصفهان", "خانه اصفهان", "مکانیکی و سرویس دوره‌ای", ["مکانیکی", "سرویس دوره‌ای"]],
  [9500006, "repair_shop", "TEST_ برق خودرو شمال", "مازندران", "ساری", "فرهنگ", "برق، دیاگ و تعمیر ECU", ["برق خودرو", "دیاگ"]],
].map(([id, type, name, province, city, neighborhood, description, services]) => ({
  id, slug: `test-business-${id}`, business_type: type,
  business_type_title: type === "car_service" ? "خدمات خودرویی" : type === "parts_store" ? "لوازم یدکی" : "تعمیرگاه",
  name, province, city, neighborhood, description, category_labels: services, services,
  logo_url: `${ASSET_BASE}/test-avatars/${type === "car_service" ? "car-service" : type === "parts_store" ? "parts-store" : "repair-shop"}.webp`,
  cover_url: `${ASSET_BASE}/economic-car.webp`, mobile_service: type === "car_service",
  price_range_text: "قیمت تستی", is_verified: true,
}));

export const PRELAUNCH_SHOWROOMS = [
  { id: 9200001, slug: "test-showroom-9200001", name: "TEST_ نمایشگاه آریا", province: "تهران", city: "تهران", neighborhood: "سعادت‌آباد", logo_url: `${ASSET_BASE}/test-avatars/dealer.webp`, cover_url: `${ASSET_BASE}/luxury-car.webp`, is_verified: true },
  { id: 9200002, slug: "test-showroom-9200002", name: "TEST_ نمایشگاه ساحل", province: "اصفهان", city: "اصفهان", neighborhood: "مرداویج", logo_url: `${ASSET_BASE}/test-avatars/dealer.webp`, cover_url: `${ASSET_BASE}/luxury-car.webp`, is_verified: true },
  { id: 9200003, slug: "test-showroom-9200003", name: "TEST_ خودرو آزاد کاسپین", province: "گیلان", city: "بندر انزلی", neighborhood: "منطقه آزاد", logo_url: `${ASSET_BASE}/test-avatars/dealer.webp`, cover_url: `${ASSET_BASE}/freezone-car.webp`, is_verified: true },
];

export const PRELAUNCH_MARKET_FLOOR = PRELAUNCH_LISTINGS.slice(0, 8).map((listing, index) => ({
  id: 9600001 + index, score: 98 - index * 3, province: listing.province,
  reason: "TEST_ امتیاز آزمایشی کف بازار", cycleEndsAt: "2027-01-01T00:00:00.000Z",
  listing: { id: listing.id, title: listing.title, brand: listing.brand, model: listing.model,
    year: listing.production_year, mileageKm: listing.mileage_km, priceToman: listing.price_toman,
    coverUrl: listing.cover_image, publicUrl: `/cars/${listing.id}` },
}));
