"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type DealerQrCardProps = {
  dealerName: string;
};

export default function DealerQrCard({ dealerName }: DealerQrCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    const url = window.location.href;
    setPageUrl(url);

    void QRCode.toDataURL(url, {
      width: 360,
      margin: 1,
      errorCorrectionLevel: "H",
      color: {
        dark: "#17111f",
        light: "#ffffff",
      },
    }).then(setQrDataUrl);
  }, []);

  return (
    <section className="dealerQrCard" aria-label={`کد QR نمایشگاه ${dealerName}`}>
      <div className="dealerQrVisual">
        {qrDataUrl ? (
          <div className="dealerQrImageWrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`QR نمایشگاه ${dealerName}`} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="dealerQrLogo" src="/brand/chakod-symbol.png" alt="" aria-hidden="true" />
          </div>
        ) : (
          <div className="dealerQrLoading">در حال ساخت QR...</div>
        )}
      </div>

      <div className="dealerQrText">
        <span>CHAKOD SHOWROOM QR</span>
        <strong>صفحه نمایشگاه را حضوری به مشتری نشان بده</strong>
        <p>
          مشتری با اسکن این کد مستقیماً وارد ویترین رسمی {dealerName} در چاکود می‌شود.
        </p>

        {qrDataUrl ? (
          <a href={qrDataUrl} download={`chakod-${dealerName}-qr.png`}>
            دانلود کد QR
          </a>
        ) : null}

        {pageUrl ? <small>{pageUrl}</small> : null}
      </div>
    </section>
  );
}
