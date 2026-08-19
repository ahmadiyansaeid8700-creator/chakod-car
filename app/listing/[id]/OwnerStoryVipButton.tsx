"use client";

import { useEffect, useState } from "react";
import StoryVipButton from "./StoryVipButton";

const API_BASE = "https://api.chakod.com";

type Props = {
  listingId: number;
  title: string;
};

type AccessResponse = {
  success?: boolean;
  access?: {
    can_view?: boolean;
    can_create_story?: boolean;
    can_cancel_story?: boolean;
  };
};

export default function OwnerStoryVipButton({ listingId, title }: Props) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem("chakod_session_token") || "";
    if (!token) {
      setAllowed(false);
      return;
    }

    const controller = new AbortController();

    void fetch(`${API_BASE}/api/my-listing-story.php?listing_id=${encodeURIComponent(listingId)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Session-Token": token,
      },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as AccessResponse;
      })
      .then((json) => {
        setAllowed(Boolean(json?.success && json.access?.can_view));
      })
      .catch(() => setAllowed(false));

    return () => controller.abort();
  }, [listingId]);

  if (!allowed) return null;

  return <StoryVipButton listingId={listingId} title={title} />;
}
