import BannerUploadEnhancer from "./BannerUploadEnhancer";
import SelectedPlacementClient from "./SelectedPlacementClient";
import ux from "./ux.module.css";

export default function AccountSelectedPage() {
  return (
    <div className={ux.scope}>
      <BannerUploadEnhancer>
        <SelectedPlacementClient />
      </BannerUploadEnhancer>
    </div>
  );
}
