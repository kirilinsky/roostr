/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build output dir. Defaults to `.next` (shared with `next dev`). Verify builds
  // set NEXT_DIST_DIR=.next-verify so a webpack `next build` can't corrupt a
  // running turbopack `next dev` (different bundlers, same cache = ENOENT).
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
