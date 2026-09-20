import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Studio",
  description: "Controle financeiro do studio",
};

// Tipo explícito em vez do LayoutProps gerado pelo Next: aquele só existe
// dentro de .next/types, então `tsc --noEmit` quebrava sempre que se rodava
// typecheck antes de um build.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-4 pb-24 sm:max-w-2xl sm:p-8 sm:pb-8 lg:max-w-6xl">
          {children}
        </div>
      </body>
    </html>
  );
}
