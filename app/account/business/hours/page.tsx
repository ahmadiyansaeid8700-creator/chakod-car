import { redirect } from "next/navigation";

export default function BusinessHoursPage() {
  redirect("/account?setup=business#professional-profile");
}
