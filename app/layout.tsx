import type { Metadata } from 'next';
import { Geist, Geist_Mono, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ModalProvider } from '@/contexts/Modal';
import { ReactQueryProvider } from '@/components/ReactQueryProvider';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
// Import your auth config to get the session
// import { auth } from "@/auth"; // If using Auth.js v5
// import { getServerSession } from "next-auth"; // If using NextAuth v4

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Oido',
    template: '%s | Oido',
  },
  description: 'Oido — AI agent studio for managing agents, channels, and skills.',
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch the session server-side
  // const session = await auth();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        'h-full antialiased',
        geistSans.variable,
        geistMono.variable,
        jetbrainsMono.variable,
        'font-sans'
      )}
    >
      <body className="min-h-full flex flex-col">
        {/* Pass session to your provider if your provider expects it */}
        <ThemeProvider>
          <SessionProvider>
            <ReactQueryProvider>
              <ModalProvider>{children}</ModalProvider>
            </ReactQueryProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
