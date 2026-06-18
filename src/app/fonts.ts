import { Anybody, Space_Grotesk } from "next/font/google";

// Headline font (display) and body/label font, exposed as CSS variables so the
// MUI theme can reference them via var(--font-headline) / var(--font-body).
export const headlineFont = Anybody({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
});

export const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
