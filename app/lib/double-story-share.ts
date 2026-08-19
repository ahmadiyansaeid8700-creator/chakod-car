import QRCode from "qrcode";

export type DoubleStoryShareInput = {
  title: string;
  sellerName?: string;
  brand?: string;
  model?: string;
  year?: string | number | null;
  priceToman?: string | number | null;
  location?: string;
  imageUrl?: string;
  publicStoryUrl: string;
};

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function formatPrice(value: string | number | null | undefined) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "قیمت توافقی";
  if (number >= 1_000_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(number / 1_000_000_000)} میلیارد تومان`;
  }
  if (number >= 1_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(number / 1_000_000)} میلیون تومان`;
  }
  return `${new Intl.NumberFormat("fa-IR").format(number)} تومان`;
}

function safeFilePart(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("fa")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "chakod";
}

function wrapText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function fitLines(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines: number,
  startSize: number,
  minSize: number,
  weight = 900,
) {
  let fontSize = startSize;
  let lines: string[] = [];
  while (fontSize >= minSize) {
    context.font = `${weight} ${fontSize}px Tahoma, Arial, sans-serif`;
    lines = wrapText(context, value, maxWidth);
    if (lines.length <= maxLines) break;
    fontSize -= 4;
  }
  return { fontSize, lines: lines.slice(0, maxLines) };
}

async function imageFromSource(src: string) {
  if (!src || typeof window === "undefined") return null;

  let objectUrl = "";
  try {
    let finalSrc = src;
    const absolute = new URL(src, window.location.origin);
    if (absolute.origin !== window.location.origin || /^https?:\/\//i.test(src)) {
      const response = await fetch(absolute.toString(), { mode: "cors", cache: "force-cache" });
      if (!response.ok) return null;
      objectUrl = URL.createObjectURL(await response.blob());
      finalSrc = objectUrl;
    }

    return await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = finalSrc;
    });
  } catch {
    return null;
  } finally {
    if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = Math.max(0, (image.naturalWidth - sourceWidth) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - sourceHeight) / 2);
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
}

export async function createDoubleStoryShareFile(input: DoubleStoryShareInput) {
  if (typeof document === "undefined") throw new Error("document-unavailable");
  if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);

  const width = 1080;
  const height = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas-unavailable");

  const base = context.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, "#1b0d2d");
  base.addColorStop(0.5, "#5b21b6");
  base.addColorStop(1, "#130818");
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);

  const [cover, qr, chakodLogo] = await Promise.all([
    imageFromSource(input.imageUrl || ""),
    QRCode.toDataURL(input.publicStoryUrl, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#241235", light: "#ffffff" },
    }).then((value) => imageFromSource(value)),
    imageFromSource("/brand/chakod-logo-full-light.png"),
  ]);

  if (cover) {
    drawCover(context, cover, width, height);
    const photoShade = context.createLinearGradient(0, 0, 0, height);
    photoShade.addColorStop(0, "rgba(11,5,18,.58)");
    photoShade.addColorStop(0.34, "rgba(11,5,18,.16)");
    photoShade.addColorStop(0.56, "rgba(11,5,18,.34)");
    photoShade.addColorStop(1, "rgba(8,4,13,.98)");
    context.fillStyle = photoShade;
    context.fillRect(0, 0, width, height);
  } else {
    const glow = context.createRadialGradient(540, 650, 20, 540, 650, 620);
    glow.addColorStop(0, "rgba(168,85,247,.34)");
    glow.addColorStop(1, "rgba(168,85,247,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  }

  // Story-safe zones: keep key content away from app controls at the very top/bottom.
  context.direction = "rtl";
  context.textBaseline = "alphabetic";
  context.textAlign = "right";

  context.fillStyle = "rgba(255,255,255,.68)";
  context.font = "800 28px Tahoma, Arial, sans-serif";
  context.fillText("دبل استوری چاکود", 950, 205);
  context.fillStyle = "#ffffff";
  context.font = "900 44px Tahoma, Arial, sans-serif";
  context.fillText(input.sellerName?.trim() || "فروشنده چاکود", 950, 265);

  roundedRect(context, 795, 1170, 185, 58, 29);
  context.fillStyle = "rgba(124,58,237,.86)";
  context.fill();
  context.fillStyle = "#f7ecff";
  context.font = "900 26px Tahoma, Arial, sans-serif";
  context.textAlign = "center";
  context.fillText(formatPrice(input.priceToman), 887, 1208);

  context.textAlign = "right";
  const title = fitLines(context, input.title || "آگهی خودرو", 900, 2, 72, 54, 900);
  context.fillStyle = "#ffffff";
  context.font = `900 ${title.fontSize}px Tahoma, Arial, sans-serif`;
  let y = 1320;
  title.lines.forEach((line) => {
    context.fillText(line, 950, y);
    y += title.fontSize * 1.45;
  });

  const vehicle = [input.brand, input.model, input.year].filter(Boolean).join(" · ");
  if (vehicle) {
    context.fillStyle = "rgba(255,255,255,.82)";
    context.font = "800 31px Tahoma, Arial, sans-serif";
    context.fillText(vehicle, 950, Math.min(y + 18, 1515));
  }
  if (input.location) {
    context.fillStyle = "rgba(255,255,255,.60)";
    context.font = "700 24px Tahoma, Arial, sans-serif";
    context.fillText(input.location, 950, Math.min(y + 66, 1565));
  }

  context.strokeStyle = "rgba(255,255,255,.16)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(70, 1605);
  context.lineTo(1010, 1605);
  context.stroke();

  if (qr) {
    roundedRect(context, 72, 1640, 176, 176, 28);
    context.fillStyle = "rgba(255,255,255,.96)";
    context.fill();
    context.drawImage(qr, 86, 1654, 148, 148);
  }

  context.textAlign = "right";
  context.fillStyle = "#ffffff";
  context.font = "900 30px Tahoma, Arial, sans-serif";
  context.fillText("مشاهده استوری و آگهی", 950, 1692);
  context.fillStyle = "rgba(255,255,255,.64)";
  context.font = "700 22px Tahoma, Arial, sans-serif";
  context.fillText("لینک همین استوری همراه اشتراک ارسال می‌شود", 950, 1735);

  if (chakodLogo) {
    context.save();
    context.globalAlpha = 0.22;
    const markWidth = 155;
    const markHeight = markWidth * (chakodLogo.naturalHeight / chakodLogo.naturalWidth);
    context.drawImage(chakodLogo, 462, 1660, markWidth, markHeight);
    context.restore();
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error("png-export-failed"));
      }, "image/png");
    } catch (reason) {
      reject(reason);
    }
  });

  return new File([blob], `chakod-double-story-${safeFilePart(input.title)}.png`, { type: "image/png" });
}

export function canShareImageFile(file: File | null) {
  return Boolean(
    file
    && typeof navigator !== "undefined"
    && typeof navigator.share === "function"
    && (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] })),
  );
}

export function downloadShareFile(file: File | null) {
  if (!file || typeof document === "undefined") return;
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
