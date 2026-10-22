import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ProvedorTema } from "@/components/ProvedorTema";
import { SCRIPT_TEMA_INICIAL } from "@/lib/tema";
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
    // suppressHydrationWarning: o script abaixo põe a classe `dark` antes do
    // React subir, então o HTML do servidor e o do cliente diferem nesse
    // atributo de propósito. Só neste elemento.
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA_INICIAL }} />
      </head>
      <body className="min-h-full">
        <ProvedorTema>
          <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-4 pb-24 sm:max-w-2xl sm:p-8 sm:pb-8 lg:max-w-6xl">
            {children}
          </div>
        </ProvedorTema>
      </body>
    </html>
  );
}
