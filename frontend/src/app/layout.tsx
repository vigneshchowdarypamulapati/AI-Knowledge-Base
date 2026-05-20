import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "DocMind | Category-Defining Document Intelligence",
  description: "The most beautiful and intuitive RAG-powered document intelligence experience imaginable.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-200">
        <Providers>
            {children}
            <Toaster position="bottom-right" toastOptions={{
                className: '!bg-neutral-900 !text-neutral-100 !border !border-white/10 !rounded-none',
            }}/>
        </Providers>
      </body>
    </html>
  );
}
