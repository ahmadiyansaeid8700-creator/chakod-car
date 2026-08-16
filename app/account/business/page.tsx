import DealerCommandCenter from "./DealerCommandCenter";
import DealerSelectedPromotionInjector from "./DealerSelectedPromotionInjector";

export const dynamic = "force-dynamic";

export default function BusinessCommandPage() {
  return (
    <>
      <DealerCommandCenter />
      <DealerSelectedPromotionInjector />
    </>
  );
}
