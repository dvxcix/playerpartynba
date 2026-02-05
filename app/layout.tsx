import type { Metadata } from 'next';
import './globals.css';
import ClientHeader from '@/components/ClientHeader';
import { PPPProvider } from '@/components/PPPContext';

export const metadata: Metadata = {
  title: 'NBA | PlayerParty',
  description: 'Check all odds for NBA games on Today',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PPPProvider>
          <div className="appShell">
            <ClientHeader />
            <main className="main">{children}</main>
            <footer className="footer">
              Built for fast sorting of game-day odd ladders across the slate.
            </footer>
          </div>
        </PPPProvider>
      </body>
    </html>
  );
}
