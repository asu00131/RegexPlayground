import type {Metadata} from 'next';
import { Inter, Source_Code_Pro } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: '正则表达式乐园',
  description: '一个强大的在线工具，用于测试、可视化和从正则表达式生成数据。',
};

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

const fontMono = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-mono',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={cn(fontSans.variable, fontMono.variable)} suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased"
      )}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
