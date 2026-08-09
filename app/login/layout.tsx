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
          <div className={styles.brandLockup}>
            <img src="/brand/chakod-logo-full-light.png" alt="" />
            <strong>چاکود</strong>
            <span>پلتفرم رشد کسب و کار خودرو</span>
          </div>

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
            <strong>به چاکود خوش آمدید</strong>
            <span>در حال ورود به صفحه اصلی...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
