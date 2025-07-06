import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "카페24 GPT 어시스턴트",
  description: "카페24 게시판 문의에 AI가 자동으로 답변을 생성해주는 SaaS 서비스",
  keywords: ["카페24", "GPT", "AI", "고객서비스", "자동답변"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
