import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KB SuperAdmin",
  description: "Jesyon Multi-Tenant pou KB Books",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ht" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
