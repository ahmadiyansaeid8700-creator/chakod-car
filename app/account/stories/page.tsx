import { redirect } from "next/navigation";

export default function AccountStoriesPage() {
  redirect("/account/listings?intent=story");
}
