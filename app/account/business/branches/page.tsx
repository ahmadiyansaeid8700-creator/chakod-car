import { redirect } from "next/navigation";

export default function BusinessBranchesPage() {
  redirect("/account?setup=business#professional-profile");
}
