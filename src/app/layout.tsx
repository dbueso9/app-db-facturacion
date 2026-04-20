import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { getCurrentUser } from "@/lib/supabase";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DB Consulting — Facturación",
  description: "Sistema de facturación para DB Consulting",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const username = user?.user_metadata?.username as string | undefined;
  const role = user?.user_metadata?.role as string | undefined;

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} dark`}
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {user && <Navbar username={username} role={role} />}
        <main className={user ? "container mx-auto px-4 py-8 max-w-7xl" : ""}>
          {children}
        </main>
      </body>
    </html>
  );
}
