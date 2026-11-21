import createMDX from "@next/mdx";

const withMDX = createMDX({ extension: /\.mdx?$/ });

/** @type {import("next").NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  experimental: {
    agentUpgrade: "security",
  },
};

export default withMDX(nextConfig);
