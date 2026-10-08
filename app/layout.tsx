import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GuestFlow",
  description: "QR event attendance, congress programme and voting",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
