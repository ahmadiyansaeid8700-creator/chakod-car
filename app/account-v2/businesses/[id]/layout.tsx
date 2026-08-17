import type { ReactNode } from "react";

import BusinessWalletCardInjector from "./BusinessWalletCardInjector";

export default function BusinessActivityLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <BusinessWalletCardInjector />
    </>
  );
}
