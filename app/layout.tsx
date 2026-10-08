import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GuestFlow",
<<<<<<< HEAD
  description: "QR event attendance and break tracking",
=======
  description: "QR event attendance, congress programme and voting",
>>>>>>> 50ba541 (Updated project)
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
