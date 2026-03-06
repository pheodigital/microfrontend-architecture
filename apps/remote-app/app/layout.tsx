// Server Component — the root layout for remote-app.
//
// remote-app runs standalone at port 3001 for isolated development.
// You can open http://localhost:3001 and use the full Todo app
// without host-app being involved at all.
//
// This is a critical microfrontend discipline:
//   Every MFE must be fully functional in isolation.
//   It should never REQUIRE the host to work.
//   The federation layer is an enhancement, not a dependency.

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TodoFlow — Remote (Todo MFE)",
  description:
    "Standalone Todo microfrontend — runs independently on port 3001",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white px-8 py-4">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <span className="text-lg font-bold tracking-tight">
              ✅ TodoFlow
            </span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              remote-app · port 3001
            </span>
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}
