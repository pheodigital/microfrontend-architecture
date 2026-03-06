// No "use client" here — this is a React Server Component (RSC).
//
// Server Components run ONLY on the server. They:
//   ✅ Render to HTML on the server — zero JavaScript sent to the browser
//   ✅ Can access databases, file system, secrets directly
//   ❌ Cannot use hooks (useState, useEffect)
//   ❌ Cannot attach event listeners (onClick, onChange)
//   ❌ Cannot use browser APIs (window, localStorage)
//
// layout.tsx is the persistent shell that wraps every page in this app.
// It renders once and stays mounted as users navigate between pages.
// Perfect for nav bars, global fonts, and providers.

import type { Metadata } from "next";
import "./globals.css";

// Metadata is only possible in Server Components.
// Next.js reads this at build time and injects it into <head>.
export const metadata: Metadata = {
  title: "TodoFlow — Host",
  description: "Microfrontend shell that consumes the Todo MFE",
};

export default function RootLayout({
  children,
}: {
  // "children" is whatever page.tsx renders — Next.js passes it in.
  // The layout wraps it, the page fills it.
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        {/* Top navigation bar — lives in the layout so it persists across pages */}
        <header className="border-b border-slate-200 bg-white px-8 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <span className="text-lg font-bold tracking-tight">
              🧩 TodoFlow
            </span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
              host-app · port 3000
            </span>
          </div>
        </header>

        {/* Page content goes here */}
        <main>{children}</main>
      </body>
    </html>
  );
}
