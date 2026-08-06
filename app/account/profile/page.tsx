import { redirect } from "next/navigation";

export default function AccountProfilePage() {
  redirect("/account?complete=1");
}
