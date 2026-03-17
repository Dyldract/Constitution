import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vote Constitution",
  description: "Votez ensemble le nom et les 30 amendements de votre constitution, puis générez le préambule.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
