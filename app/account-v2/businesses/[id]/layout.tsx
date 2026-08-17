import type { ReactNode } from "react";

import BusinessPanelSwitcher from "./BusinessPanelSwitcher";

export default function BusinessActivityLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <BusinessPanelSwitcher />
    </>
  );
}
