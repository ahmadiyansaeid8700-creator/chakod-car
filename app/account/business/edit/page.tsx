import { redirect } from "next/navigation";

export default function EditBusinessPage() {
  redirect("/account?setup=business#professional-profile");
}
