"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import ux from "./banner-upload.module.css";

type Slot = "desktop" | "mobile";
type Preview = { url: string; name: string } | null;
type Props = { children: ReactNode };
type Toast = { text: string; tone: "success" | "error" } | null;

function slotForInput(input: HTMLInputElement): Slot | null {
  const label = input.closest("label");
  const text = label?.textContent || "";
  if (text.includes("دسکتاپ")) return "desktop";
  if (text.includes("موبایل")) return "mobile";
  return null;
}

function messageTone(text: string): "success" | "error" {
  return /نشد|برقرار نشد|نیست|نامعتبر|خطا/.test(text) ? "error" : "success";
}

function findManagerMessage(host: HTMLElement) {
  const candidates = Array.from(host.querySelectorAll<HTMLElement>("div"));
  return (
    candidates.find((candidate) => {
      const text = candidate.textContent?.trim() || "";
      if (!text) return false;
      const next = candidate.nextElementSibling as HTMLElement | null;
      const buttonText = next?.querySelector("button")?.textContent?.trim() || "";
      return buttonText.includes("ذخیره و انتشار ویترین");
    }) || null
  );
}

export default function BannerUploadEnhancer({ children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [desktopPreview, setDesktopPreview] = useState<Preview>(null);
  const [mobilePreview, setMobilePreview] = useState<Preview>(null);
  const [desktopTarget, setDesktopTarget] = useState<HTMLElement | null>(null);
  const [mobileTarget, setMobileTarget] = useState<HTMLElement | null>(null);
  const [desktopUploading, setDesktopUploading] = useState(false);
  const [mobileUploading, setMobileUploading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const host = root;

    const objectUrls = new Set<string>();
    let lastMessage = "";

    function refreshTargets() {
      const inputs = Array.from(host.querySelectorAll<HTMLInputElement>('input[type="file"]'))
        .filter((input) => slotForInput(input));

      for (const input of inputs) {
        input.accept = "image/*,.heic,.heif";
        const label = input.closest("label") as HTMLElement | null;
        const slot = slotForInput(input);
        if (slot === "desktop") {
          setDesktopTarget(label);
          setDesktopUploading(input.disabled);
        }
        if (slot === "mobile") {
          setMobileTarget(label);
          setMobileUploading(input.disabled);
        }
      }

      const message = findManagerMessage(host)?.textContent?.trim() || "";
      if (message && message !== lastMessage) {
        lastMessage = message;
        setToast({ text: message, tone: messageTone(message) });
      }
      if (!message) lastMessage = "";
    }

    function handleChange(event: Event) {
      const input = event.target instanceof HTMLInputElement ? event.target : null;
      if (!input || input.type !== "file") return;
      const slot = slotForInput(input);
      const file = input.files?.[0];
      if (!slot || !file) return;

      const url = URL.createObjectURL(file);
      objectUrls.add(url);
      const preview = { url, name: file.name || "تصویر انتخاب‌شده" };

      if (slot === "desktop") {
        setDesktopPreview((current) => {
          if (current?.url && objectUrls.has(current.url)) {
            URL.revokeObjectURL(current.url);
            objectUrls.delete(current.url);
          }
          return preview;
        });
        setDesktopUploading(true);
      } else {
        setMobilePreview((current) => {
          if (current?.url && objectUrls.has(current.url)) {
            URL.revokeObjectURL(current.url);
            objectUrls.delete(current.url);
          }
          return preview;
        });
        setMobileUploading(true);
      }
    }

    refreshTargets();
    host.addEventListener("change", handleChange, true);

    const observer = new MutationObserver(() => refreshTargets());
    observer.observe(host, {
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled"],
      childList: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      host.removeEventListener("change", handleChange, true);
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function previewNode(preview: Preview, uploading: boolean, slot: Slot) {
    if (!preview) return null;
    return (
      <div className={`${ux.preview} ${slot === "desktop" ? ux.desktop : ux.mobile}`} aria-live="polite">
        <img src={preview.url} alt={preview.name} />
        <div className={ux.status}>
          {uploading ? <span className={ux.spinner} aria-hidden="true" /> : <span className={ux.done} aria-hidden="true">✓</span>}
          <strong>{uploading ? "در حال بارگذاری تصویر…" : "تصویر انتخاب شد"}</strong>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={ux.root}>
      {children}
      {desktopTarget ? createPortal(previewNode(desktopPreview, desktopUploading, "desktop"), desktopTarget) : null}
      {mobileTarget ? createPortal(previewNode(mobilePreview, mobileUploading, "mobile"), mobileTarget) : null}
      {toast && typeof document !== "undefined"
        ? createPortal(
            <div
              className={`${ux.toast} ${toast.tone === "error" ? ux.toastError : ux.toastSuccess}`}
              role={toast.tone === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              <span aria-hidden="true">{toast.tone === "error" ? "!" : "✓"}</span>
              <strong>{toast.text}</strong>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
