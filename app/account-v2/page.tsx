import { redirect } from "next/navigation";

// مسیر «مدیریت کسب‌وکار» از سوییچر حساب در دسترس می‌ماند؛
// /account-v2 فقط ورودی قدیمی است و کاربر را به مرکز مدیریت حساب شخصی می‌فرستد.
export default function AccountV2Page() {
  redirect("/account");
}
