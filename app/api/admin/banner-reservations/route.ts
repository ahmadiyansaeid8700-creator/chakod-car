import { desc, eq } from "drizzle-orm";
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
    reservations: rows.map((row) => ({
      ...row,
      cities: JSON.parse(row.citiesJson) as string[],
    })),
  });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return Response.json({ error: "دسترسی مدیریت ندارید." }, { status: 403 });
  }

  const payload = (await request.json()) as {
    id?: number;
    reviewStatus?: "approved" | "rejected";
    adminNote?: string;
  };
  const id = Number(payload.id);
  const reviewStatus = payload.reviewStatus;
  const adminNote =
    typeof payload.adminNote === "string"
      ? payload.adminNote.trim().slice(0, 500)
      : "";

  if (!Number.isInteger(id) || !["approved", "rejected"].includes(reviewStatus ?? "")) {
    return Response.json({ error: "درخواست مدیریت معتبر نیست." }, { status: 400 });
  }

  const [reservation] = await getDb()
    .update(bannerReservations)
    .set({
      reviewStatus,
      adminNote,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(bannerReservations.id, id))
    .returning();

  if (!reservation) {
    return Response.json({ error: "رزرو پیدا نشد." }, { status: 404 });
  }

  return Response.json({ reservation });
}
