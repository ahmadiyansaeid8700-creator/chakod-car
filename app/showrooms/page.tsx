import { permanentRedirect } from "next/navigation";

export default function LegacyShowroomsPage() {
  permanentRedirect("/dealerships");
}
