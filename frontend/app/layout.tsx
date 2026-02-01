// frontend/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "TrusToken",
  description: "Upload sustainable actions → verify with AI → mint Solana NFT certificate",
};

function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
      style={{ display: "inline-block", verticalAlign: "middle", flex: "0 0 auto" }}
    >
      <defs>
        <linearGradient id="tt-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#10b981", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#059669", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <polygon
        points="100,10 180,55 180,145 100,190 20,145 20,55"
        fill="url(#tt-gradient)"
        stroke="#047857"
        strokeWidth="3"
      />
    </svg>
  );
}

function Brand({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
    >
      <LogoMark size={size} />
      <span style={{ lineHeight: 1 }}>TrusToken</span>
    </span>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Sticky top banner */}
        <div className="topBanner">
          <div className="topBannerInner">
            <div className="topBannerText">
              <strong>
                <Brand size={16} />
              </strong>{" "}
              — Upload → Verify with AI → Mint your certificate (Devnet)
            </div>

            <a
              className="topBannerLink"
              href="https://faucet.solana.com"
              target="_blank"
              rel="noreferrer"
              title="Open Solana devnet faucet"
            >
              Get devnet SOL
            </a>
          </div>
        </div>

        {/* Full-width hero image + left info box */}
        <section className="heroFull">
          <Image
            src="/eco-banner.png"
            alt="Sustainability banner"
            fill
            priority
            sizes="100vw"
            className="heroBg"
          />

          <div className="heroInner">
            <div className="heroCard">
              <div className="heroKicker">Verified Impact • Solana Devnet</div>

              <h1 className="heroTitle">
                <Brand size={34} />
              </h1>

              <p className="heroDesc">
                Upload an image + description, get AI verification, then mint an NFT certificate on Solana devnet.
              </p>

              <div className="heroActions">
                {/* Jump to main content */}
                <a className="heroBtn" href="#main">
                  Get Started
                </a>

                <a
                  className="heroBtnSecondary"
                  href="https://faucet.solana.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Faucet
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <div className="container" id="main">
          {children}
        </div>
      </body>
    </html>
  );
}
