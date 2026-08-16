"use client";

import { useEffect } from "react";

const REMOVE_LABELS = new Set(["حذف عضو", "حذف از تیم"]);

export default function DealerTeamRemovalEnhancer() {
  useEffect(() => {
    function enhance() {
      const main = document.querySelector<HTMLElement>('main[dir="rtl"]');
      if (!main) return;

      main.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
        const label = (button.textContent || "").trim();
        if (REMOVE_LABELS.has(label)) {
          button.dataset.teamRemoveAction = "true";
          if (!button.disabled) button.textContent = "حذف از تیم";
        } else if (label === "در حال حذف…") {
          button.dataset.teamRemoveAction = "true";
        } else if (label === "لغو دعوت") {
          button.dataset.teamRemoveAction = "true";
          button.dataset.teamRemoveInvite = "true";
        }
      });

      const cards = Array.from(main.querySelectorAll<HTMLElement>("article"));
      cards.forEach((card) => {
        const text = card.textContent || "";
        if (!text.includes("مالک")) return;
        if (card.querySelector('[data-team-owner-note="true"]')) return;
        if (card.querySelector('[data-team-remove-action="true"]')) return;

        const note = document.createElement("div");
        note.dataset.teamOwnerNote = "true";
        note.textContent = "مالک اصلی نمایشگاه قابل حذف از تیم نیست.";
        card.appendChild(note);
      });
    }

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, []);

  return (
    <style jsx global>{`
      button[data-team-remove-action="true"] {
        min-height: 40px !important;
        flex: 1 1 140px !important;
        padding: 0 14px !important;
        border: 1px solid #f0bdc8 !important;
        border-radius: 11px !important;
        color: #a32640 !important;
        background: linear-gradient(135deg, #fff3f5, #ffe8ed) !important;
        font-weight: 950 !important;
        box-shadow: none !important;
      }

      button[data-team-remove-action="true"]:not(:disabled):hover {
        border-color: #de8fa0 !important;
        background: #ffe3e9 !important;
      }

      button[data-team-remove-action="true"]:disabled {
        opacity: .62 !important;
        cursor: wait !important;
      }

      [data-team-owner-note="true"] {
        margin-top: 10px;
        padding: 9px 11px;
        border: 1px solid rgba(111, 40, 217, .08);
        border-radius: 10px;
        color: #7a6c82;
        background: #faf7fd;
        font-size: 10px;
        line-height: 1.8;
        text-align: center;
      }

      @media (max-width: 560px) {
        button[data-team-remove-action="true"] {
          min-height: 42px !important;
          font-size: 12px !important;
        }
      }
    `}</style>
  );
}
