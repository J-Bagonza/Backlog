import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "the photo box.",
  description: "old pictures, kept exactly as they were.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
