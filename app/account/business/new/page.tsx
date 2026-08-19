import { redirect } from "next/navigation";

export default function NewBusinessPage() {
  redirect("/account?setup=business");
}
