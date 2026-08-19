import type { ReactNode } from "react";

import ListingAttributionBridge from "./ListingAttributionBridge";

type AccountLayoutProps = {
  children: ReactNode;
};

export default function AccountLayout({ children }: AccountLayoutProps) {
  return (
    <>
      <ListingAttributionBridge />
      {children}
    </>
  );
}
