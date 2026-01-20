import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ENROUTE Release Calendar',
  description: 'Product release and inbound order management for ENROUTE',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
