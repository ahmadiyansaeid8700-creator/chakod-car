import { redirect } from "next/navigation";

// مسیر «مدیریت کسب‌وکار» از سوییچر حساب در دسترس می‌ماند؛
// /account-v2 ورودی قدیمی حساب است، اما اگر dealer_id همراه آن باشد
// کاربر مستقیم به مرکز مدیریت همان نمایشگاه هدایت می‌شود.
export default async function AccountV2Page({
  searchParams,
}: {
  searchParams: Promise<{ dealer_id?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawDealerId = Array.isArray(params.dealer_id) ? params.dealer_id[0] : params.dealer_id;
  const dealerId = Math.max(0, Math.round(Number(rawDealerId || 0)));

  if (dealerId) {
    redirect(`/account/business?dealer_id=${dealerId}`);
  }

  redirect("/account");
}
