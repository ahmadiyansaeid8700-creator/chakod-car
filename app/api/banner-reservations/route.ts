import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { bannerReservations } from "../../../db/schema";
import {
  BANNER_CITIES,
  BUSINESS_TYPES,
  calculateBannerPrice,
  type BusinessType,
} from "../../../lib/banner-booking";

type ReservationPayload = {
  businessName?: string;
  businessType?: string;
  campaignTitle?: string;
  destinationUrl?: string;
  cities?: string[];
  startDate?: string;
  endDate?: string;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseDestinationUrl(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: "برای مشاهده رزروها وارد شوید." }, { status: 401 });
  }

  const rows = await getDb()
    .select()
    .from(bannerReservations)
    .where(eq(bannerReservations.ownerEmail, user.email))
    .orderBy(desc(bannerReservations.createdAt), desc(bannerReservations.id))
    .limit(30);

  return Response.json({
    reservations: rows.map((row) => ({
      ...row,
      cities: JSON.parse(row.citiesJson) as string[],
    })),
  });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: "برای رزرو بنر وارد شوید." }, { status: 401 });
  }

  let payload: ReservationPayload;
  try {
    payload = (await request.json()) as ReservationPayload;
  } catch {
    return Response.json({ error: "اطلاعات درخواست معتبر نیست." }, { status: 400 });
  }

  const businessName = cleanText(payload.businessName, 90);
  const campaignTitle = cleanText(payload.campaignTitle, 120);
  const businessType = cleanText(payload.businessType, 20) as BusinessType;
  const startDate = cleanText(payload.startDate, 10);
  const endDate = cleanText(payload.endDate, 10);
  const destinationUrlInput = cleanText(payload.destinationUrl, 500);
  const destinationUrl = parseDestinationUrl(destinationUrlInput);
  const cities = Array.from(
    new Set(
      (Array.isArray(payload.cities) ? payload.cities : []).filter((city) =>
        (BANNER_CITIES as readonly string[]).includes(city),
      ),
    ),
  );
  const quote = calculateBannerPrice(startDate, endDate, cities.length);

  if (!businessName || !campaignTitle) {
    return Response.json(
      { error: "نام کسب‌وکار و عنوان تبلیغ را کامل کنید." },
      { status: 400 },
    );
  }
  if (!(businessType in BUSINESS_TYPES)) {
    return Response.json(
      { error: "این جایگاه فقط برای حساب‌های کسب‌وکار فعال است." },
      { status: 400 },
    );
  }
  if (!cities.length || !quote.days) {
    return Response.json(
      { error: "حداقل یک شهر و بازه زمانی معتبر انتخاب کنید." },
      { status: 400 },
    );
  }
  if (destinationUrlInput && !destinationUrl) {
    return Response.json(
      { error: "لینک مقصد باید با http یا https شروع شود." },
      { status: 400 },
    );
  }

  const [reservation] = await getDb()
    .insert(bannerReservations)
    .values({
      ownerEmail: user.email,
      businessName,
      businessType,
      campaignTitle,
      destinationUrl,
      citiesJson: JSON.stringify(cities),
      startDate,
      endDate,
      reservedDays: quote.days,
      cityCount: quote.cityCount,
      cityDayRate: 1_000_000,
      totalPrice: quote.total,
      paymentStatus: "demo_paid",
      reviewStatus: "pending",
    })
    .returning();

  return Response.json(
    {
      reservation: {
        ...reservation,
        cities,
      },
      message: "پرداخت آزمایشی ثبت شد و درخواست برای تأیید مدیریت ارسال شد.",
    },
    { status: 201 },
  );
}
