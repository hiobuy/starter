import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "HIOBuy Demo Storefront",
  description:
    "Open-source Next.js starter that demos HIOBuy Product API: keyword search, image search, and product detail.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Sora:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="orbits" aria-hidden>
          <span className="orb orb-a" />
          <span className="orb orb-b" />
          <span className="orb orb-c" />
          <span className="orb orb-d" />
        </div>
        <SiteHeader />
        <main>{children}</main>
        <footer className="footer">
          <div className="shell footer-inner">
            <p>
              Demo only — not a production storefront. Powered by the{" "}
              <a
                href="https://developers.hiobuy.com"
                target="_blank"
                rel="noreferrer"
              >
                HIOBuy Product API
              </a>
              . Keep your API key in <code>.env.local</code>; never commit it.
            </p>
            <nav className="footer-links">
              <a
                href="https://developers.hiobuy.com"
                target="_blank"
                rel="noreferrer"
              >
                Docs
              </a>
              <a
                href="https://api.hiobuy.com/openapi.json"
                target="_blank"
                rel="noreferrer"
              >
                API
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
