import { redirect } from "next/navigation";

export default function BusinessMediaPage() {
  redirect("/account?setup=business#professional-profile");
}
