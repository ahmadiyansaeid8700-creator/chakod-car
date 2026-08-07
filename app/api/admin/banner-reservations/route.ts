import { desc } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { bannerReservations } from "../../../../db/schema";
import { isAdminEmail } from "../../../../lib/admin-access";

async function requireAdmin() {
  const user = await getChatGPTUser();
  return user && (await isAdminEmail(user.email)) ? user : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return Response.json({ error: "دسترسی مدیریت ندارید." }, { status: 403 });
  }

  const rows = await getDb()
    .select()
    .from(bannerReservations)
    .orderBy(desc(bannerReservations.createdAt), desc(bannerReservations.id))
    .limit(100);

  return Response.json({
    retired: true,
    message: "رزرو بنر قدیمی فقط به صورت سابقه خواندنی نگهداری می شود.",
    reservations: rows.map((row) => ({
      ...row,
      cities: JSON.parse(row.citiesJson) as string[],
    })),
  });
}

export async function PATCH() {
  return Response.json(
    {
      error: "مدیریت رزرو بنر قدیمی بازنشسته شده است.",
      code: "LEGACY_BANNER_RESERVATION_RETIRED",
      replacement: "/admin/featured-showrooms",
    },
    { status: 410 },
  );
}
