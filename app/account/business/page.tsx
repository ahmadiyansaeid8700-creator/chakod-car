import DealerCommandCenter from "./DealerCommandCenter";
import DealerSelectedPromotionInjector from "./DealerSelectedPromotionInjector";
import DealerTeamRemovalEnhancer from "./DealerTeamRemovalEnhancer";

export const dynamic = "force-dynamic";

export default function BusinessCommandPage() {
  return (
    <>
      <DealerCommandCenter />
      <DealerSelectedPromotionInjector />
      <DealerTeamRemovalEnhancer />
    </>
  );
}
