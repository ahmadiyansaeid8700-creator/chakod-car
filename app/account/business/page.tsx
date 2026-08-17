import DealerCommandCenter from "./DealerCommandCenter";
import DealerSelectedPromotionInjector from "./DealerSelectedPromotionInjector";
import DealerTeamRemovalEnhancer from "./DealerTeamRemovalEnhancer";
import DealerWalletCardInjector from "./DealerWalletCardInjector";

export const dynamic = "force-dynamic";

export default function BusinessCommandPage() {
  return (
    <>
      <DealerCommandCenter />
      <DealerSelectedPromotionInjector />
      <DealerWalletCardInjector />
      <DealerTeamRemovalEnhancer />
    </>
  );
}
