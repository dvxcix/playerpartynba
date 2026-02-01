import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Alternate NBA Props Odds Tracker',
  description: 'Excel-like odds grid powered by Supabase + TheOddsAPI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="appShell">
          <header className="header">
            <div>
              <div className="title">Alternate NBA Props Odds Tracker</div>
              <div className="subtitle">Supabase + TheOddsAPI • refreshes every 30 minutes</div>
            </div>
            <a className="pill" href="/api/odds/csv" target="_blank" rel="noreferrer">
              Export CSV
            </a>
          </header>
          <main className="main">{children}</main>
          <footer className="footer">Built for fast sorting/filtering like a spreadsheet.</footer>
        </div>
      </body>
    </html>
  );
}
