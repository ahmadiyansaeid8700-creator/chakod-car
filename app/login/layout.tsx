import type { ReactNode } from "react";

import styles from "./WelcomeIntro.module.css";

type LoginLayoutProps = {
  children: ReactNode;
};

export default function LoginLayout({ children }: LoginLayoutProps) {
  return (
    <div className={styles.root}>
      {children}

      <div className={styles.overlay} aria-hidden="true">
        <div className={styles.splashFrame}>
          <img
            className={styles.splashArtwork}
            src="/brand/chakod-welcome-final.webp"
            alt=""
          />

          <span className={`${styles.headlightFlash} ${styles.headlightLeft}`} />
          <span className={`${styles.headlightFlash} ${styles.headlightRight}`} />
          <span className={styles.floorPulse} />
        </div>
      </div>
    </div>
  );
}
