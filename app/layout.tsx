import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./common/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ai Buid Studio",
  description: "Generated React Components using Ai Buid Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >

      <body className="min-h-full flex flex-col">
        <Navbar />
        <div className="flex-1">
          {children}
        </div>
        <footer className="border-t border-white/40 bg-white/55 px-5 py-4 text-center text-sm text-slate-600 backdrop-blur-xl">
          Designed by Raghava
        </footer>
      </body>
    </html>
  );
}
