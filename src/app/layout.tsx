import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MiniRAG - Retrieval Augmented Generation",
  description: "A simple RAG application with citations, powered by Gemini, Supabase, and Cohere",
  keywords: ["RAG", "AI", "LLM", "Gemini", "Supabase", "Cohere", "Citations"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        {children}
      </body>
    </html>
  );
}
