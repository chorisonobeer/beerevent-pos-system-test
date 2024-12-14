const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLintエラーを警告として扱い、ビルドを続行
    ignoreDuringBuilds: true,
  },
};

module.exports = withPWA(nextConfig);
