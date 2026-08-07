import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "@/components/LocaleProvider";

export const metadata: Metadata = {
  title: "Constitution",
  description:
    "Proposez et votez ensemble le nom et les 30 amendements de votre constitution, puis générez le préambule. / Propose and vote together on your constitution amendments, then generate the preamble.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased min-h-screen font-sans">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
