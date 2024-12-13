const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  reactStrictMode: true,
  env: {
    SPREADSHEET_ID: process.env.SPREADSHEET_ID,
    TEMPLATE_SPREADSHEET_ID: process.env.TEMPLATE_SPREADSHEET_ID,
  },
};

module.exports = withPWA(nextConfig);
