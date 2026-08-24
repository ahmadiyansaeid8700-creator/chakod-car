import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./AdminPage.module.css";

export function AdminPage({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      {children}
    </main>
  );
}

export function AdminPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function FeatureGrid({
  items,
}: {
  items: Array<{ title: string; description?: string; href?: string; icon?: string }>;
}) {
  return (
    <div className={styles.featureGrid}>
      {items.map((item) => {
        const content = (
          <>
            <span className={styles.featureIcon}>{item.icon || "•"}</span>
            <span>
              <strong>{item.title}</strong>
              {item.description ? <small>{item.description}</small> : null}
            </span>
            {item.href ? <em>←</em> : null}
          </>
        );

        return item.href ? (
          <Link className={styles.featureCard} href={item.href} key={item.title}>
            {content}
          </Link>
        ) : (
          <article className={styles.featureCard} key={item.title}>
            {content}
          </article>
        );
      })}
    </div>
  );
}

export function StatusPill({ children }: { children: ReactNode }) {
  return <span className={styles.statusPill}>{children}</span>;
}

export { styles as adminPageStyles };
