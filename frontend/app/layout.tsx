import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
import "./font.css";

export const metadata: Metadata = {
  title: "AI Knowledge Base",
  description:
    "Upload documents, build knowledge bases, and chat with your content using AI-powered RAG.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
