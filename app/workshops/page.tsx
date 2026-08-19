import { redirect } from "next/navigation";

export default function WorkshopsPage() {
  redirect("/businesses?type=repair_shop");
}
