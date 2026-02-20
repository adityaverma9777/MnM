import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MnM — Synchronized Watch",
  description: "Private two-person synchronized video watch platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
