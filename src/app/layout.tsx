import type { Metadata } from "next";
// @ts-ignore: side-effect CSS import declaration may be missing in this environment
import "./globals.css";

export const metadata: Metadata = {
  title: "BackRoll",
  description: "old pictures, kept exactly as they were.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
