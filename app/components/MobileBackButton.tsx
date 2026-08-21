"use client";

import { useRouter } from "next/navigation";

import styles from "./MobileBackButton.module.css";

type MobileBackButtonProps = {
  fallbackHref?: string;
  className?: string;
  tone?: "light" | "dark";
};

export default function MobileBackButton({
  fallbackHref = "/",
  className = "",
  tone = "light",
}: MobileBackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      className={`${styles.button} ${tone === "dark" ? styles.dark : ""} ${className}`.trim()}
      onClick={handleBack}
      aria-label="بازگشت به صفحه قبل"
      title="بازگشت"
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m9 5 7 7-7 7"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
