import { redirect } from "next/navigation";

export default function LegacyMyListingsPage() {
  redirect("/account/listings");
}
