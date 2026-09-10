import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stride | API Claws Smartwatch Companion",
  description:
    "A reusable Next.js example for one private API Claws Agent per smartwatch user.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
