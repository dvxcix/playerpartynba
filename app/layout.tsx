import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NBA | PlayerParty',
  description: 'Check all odds for NBA games on Today',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="appShell">
          <header className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* PlayerParty Logo */}
              <img
                src="/PPicon.png"
                alt="PlayerParty"
                style={{
                  height: '36px',
                  width: '36px',
                  objectFit: 'contain',
                }}
              />

              {/* Title + subtitle */}
              <div>
                <div className="title">
                  NBA Dashboard | PlayerParty (v A3.21)
                </div>
                <div className="subtitle">
                  Check all odds for NBA games on Today, updated every 15min.
                </div>
              </div>
            </div>

            <a
              className="pill"
              href="/api/odds/csv"
              target="_blank"
              rel="noreferrer"
            >
              Export CSV
            </a>
          </header>

          <main className="main">{children}</main>

          <footer className="footer">
            Built for fast sorting of game-day odd ladders across the slate.
          </footer>
        </div>
      </body>
    </html>
  );
}
