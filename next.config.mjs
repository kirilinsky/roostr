/** @type {import('next').NextConfig} */
const nextConfig = {
  // Let the Telegram login popup talk back to the opener window. Without an
  // explicit COOP, some setups default to "same-origin" which blocks the
  // widget's postMessage and silently breaks login.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
