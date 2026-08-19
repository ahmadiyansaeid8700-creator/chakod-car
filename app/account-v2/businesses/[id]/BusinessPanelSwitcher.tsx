"use client";

import { useEffect } from "react";

type PanelKey = "resume" | "team" | "info";

const panelConfig: Array<{ key: PanelKey; href: string; selector: string }> = [
  { key: "resume", href: "#business-resume", selector: "#business-resume" },
  { key: "team", href: "#business-team", selector: "#business-team" },
  { key: "info", href: "#business-info", selector: "#business-info" },
];

export default function BusinessPanelSwitcher() {
  useEffect(() => {
    let activePanel: PanelKey | null = null;
    const listeners = new Map<Element, EventListener>();

    function applyPanelState() {
      for (const item of panelConfig) {
        const panel = document.querySelector<HTMLElement>(item.selector);
        const trigger = document.querySelector<HTMLElement>(`a[href="${item.href}"]`);
        const isActive = activePanel === item.key;

        if (panel) {
          panel.hidden = !isActive;
          panel.setAttribute("aria-hidden", isActive ? "false" : "true");
        }

        if (trigger) {
          trigger.setAttribute("aria-expanded", isActive ? "true" : "false");
          trigger.dataset.businessPanelActive = isActive ? "true" : "false";
          trigger.style.borderColor = isActive ? "rgba(124, 58, 237, .55)" : "";
          trigger.style.background = isActive ? "linear-gradient(135deg, #ffffff 0%, #f4ebff 100%)" : "";
          trigger.style.boxShadow = isActive ? "0 10px 28px rgba(92, 35, 150, .12)" : "";
        }
      }
    }

    function bindTriggers() {
      for (const item of panelConfig) {
        const trigger = document.querySelector<HTMLElement>(`a[href="${item.href}"]`);
        if (!trigger || listeners.has(trigger)) continue;

        const listener: EventListener = (event) => {
          event.preventDefault();
          activePanel = item.key;
          applyPanelState();

          window.requestAnimationFrame(() => {
            document.querySelector<HTMLElement>(item.selector)?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          });
        };

        trigger.addEventListener("click", listener);
        listeners.set(trigger, listener);
      }

      applyPanelState();
    }

    bindTriggers();
    const observer = new MutationObserver(bindTriggers);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      for (const [element, listener] of listeners) {
        element.removeEventListener("click", listener);
      }
      listeners.clear();
    };
  }, []);

  return null;
}
