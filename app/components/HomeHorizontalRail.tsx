"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

type HomeHorizontalRailProps = {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
  showControls?: boolean;
};

export default function HomeHorizontalRail({
  children,
  ariaLabel,
  className = "",
  showControls = true,
}: HomeHorizontalRailProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  function scroll(direction: "previous" | "next") {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const distance = Math.max(track.clientWidth * 0.82, 280);

    track.scrollBy({
      left: direction === "next" ? -distance : distance,
      behavior: "smooth",
    });
  }

  return (
    <div className={`homeRailShell ${className}`.trim()}>
      {showControls ? (
        <div className="homeRailControls" aria-label={`پیمایش ${ariaLabel}`}>
          <button
            type="button"
            className="homeRailControl homeRailControl--right"
            onClick={() => scroll("previous")}
            aria-label={`موارد قبلی ${ariaLabel}`}
          >
            ›
          </button>

          <button
            type="button"
            className="homeRailControl homeRailControl--left"
            onClick={() => scroll("next")}
            aria-label={`موارد بعدی ${ariaLabel}`}
          >
            ‹
          </button>
        </div>
      ) : null}

      <div className="homeRailTrack" ref={trackRef} aria-label={ariaLabel}>
        {children}
      </div>

      <div className="homeRailHint" aria-hidden="true">
        برای دیدن موارد بیشتر، افقی بکشید
      </div>
    </div>
  );
}
