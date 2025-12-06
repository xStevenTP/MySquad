import type { Metadata } from "next";
import "./globals.css";
import { checkAndSeed } from "@/lib/db/seed-sports-data";

export const metadata: Metadata = {
  title: "MySquad - Track Your Favorite Teams",
  description: "Track schedules and standings for your favorite sports and esports teams",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Auto-seed sports data on first app initialization
  await checkAndSeed();

  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
