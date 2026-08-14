import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/account/listings",
        has: [{ type: "query", key: "intent", value: "story" }],
        destination: "/account/stories",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
