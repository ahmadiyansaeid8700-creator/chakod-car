import { redirect } from "next/navigation";

export default function PartsStoresPage() {
  redirect("/businesses?type=parts_store");
}
