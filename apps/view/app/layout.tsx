import type { Metadata } from 'next';
import { Providers } from '@/components/providers/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Trip Planner',
  description: 'AI-powered trip planning application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Use SDK provider by default (can be controlled via env var)
  const useSdk = process.env.NEXT_PUBLIC_USE_SDK !== 'false';

  return (
    <html lang="en">
      <body>
        <Providers useSdk={useSdk}>{children}</Providers>
      </body>
    </html>
  );
}
