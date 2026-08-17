import type { ReactNode } from "react";

import AccountFinanceContext from "./AccountFinanceContext";

type AccountLayoutProps = {
  children: ReactNode;
};

export default function AccountLayout({ children }: AccountLayoutProps) {
  return (
    <>
      <AccountFinanceContext />
      {children}
    </>
  );
}
