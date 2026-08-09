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
        <div className={styles.scene}>
          <div className={styles.roadGlow} />

          <div className={styles.car}>
            <div className={styles.windshield} />
            <div className={styles.hood}>
              <span className={styles.badge}>BMW</span>
            </div>

            <div className={`${styles.headlight} ${styles.headlightLeft}`}>
              <span />
            </div>
            <div className={`${styles.headlight} ${styles.headlightRight}`}>
              <span />
            </div>

            <div className={styles.grilles}>
              <span />
              <span />
            </div>

            <div className={styles.bumper} />
          </div>

          <div className={styles.welcomeCopy}>
            <strong>خوش اومدی به چاکود</strong>
            <span>سفر خوبت از اینجا شروع میشه</span>
          </div>
        </div>
      </div>
    </div>
  );
}
