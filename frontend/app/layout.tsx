import "./globals.css";

export const metadata = {
  title: "Proof-of-Impact Marketplace",
  description: "Upload sustainable actions → verify with AI → mint Solana NFT certificate"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
