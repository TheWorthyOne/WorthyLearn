import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorthyLearn",
  description: "Generate adaptive AI syllabi and mind maps for any topic.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

