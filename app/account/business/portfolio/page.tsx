import { redirect } from "next/navigation";

export default function BusinessPortfolioPage() {
  redirect("/account?setup=business#professional-profile");
}
