"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function AppViewport({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <div ref={viewportRef} className="appViewport">
      {children}
    </div>
  );
}
