import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Самодостаточная сборка для Docker-образа.
  output: "standalone",
};

export default nextConfig;
