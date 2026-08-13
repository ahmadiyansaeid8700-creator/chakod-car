import { redirect } from "next/navigation";

// The former «مدیریت کسب‌وکار» hub is intentionally retired.
// Business destinations are now opened from the account switcher, including /account/business?dealer_id=...
export default function AccountV2Page() {
  redirect("/account-v2/profile");
}
