import { redirect } from "next/navigation";

export default function CarServicesPage() {
  redirect("/businesses?type=car_service");
}
