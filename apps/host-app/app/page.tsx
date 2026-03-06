// Server Component — no "use client".
//
// This page renders the three-column dashboard layout.
// The layout itself is static HTML — the server generates it instantly.
//
// The interactive panels (StatsPanel, ActivityFeed, RemoteTodo) are
// Client Components. They are imported here but their JS only runs
// in the browser — this Server Component just marks where they go.
//
// This separation is the key App Router insight:
//   Server Component  → renders the grid, ships zero JS
//   Client Components → fill the slots, ship their own JS bundles

import { Suspense } from 'react'

// These are placeholders for now — each gets built out in later PRs:
//   PR-05 → StatsPanel, ActivityFeed (real layout)
//   PR-06 → RemoteTodo (federated import)
//   PR-07 → StatsPanel reads live from mini-store
//   PR-08 → ActivityFeed subscribes to event bus

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-8 py-10">

      <h1 className="mb-8 text-3xl font-bold text-slate-800">
        Dashboard
      </h1>

      <div className="grid grid-cols-12 gap-6">

        {/* LEFT: Stats sidebar — will read from shared mini-store in PR-07 */}
        <aside className="col-span-3 space-y-4">
          <SectionLabel>Stats</SectionLabel>
          <PlaceholderBox label="StatsPanel — coming in PR-07" />
        </aside>

        {/* CENTRE: The federated TodoApp MFE — arrives in PR-06 */}
        <section className="col-span-6">
          <SectionLabel>Todos</SectionLabel>

          {/*
            Suspense lets Next.js stream the page shell to the browser
            immediately, then fill this slot once the async content resolves.
            PR-06 will replace PlaceholderBox with the real federated import.
          */}
          <Suspense fallback={<TodoSkeleton />}>
            <PlaceholderBox label="RemoteTodo (federated) — coming in PR-06" />
          </Suspense>
        </section>

        {/* RIGHT: Activity feed — will subscribe to event bus in PR-08 */}
        <aside className="col-span-3">
          <SectionLabel>Activity</SectionLabel>
          <PlaceholderBox label="ActivityFeed — coming in PR-08" />
        </aside>

      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small helper components used only on this page
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
      {children}
    </p>
  )
}

function PlaceholderBox({ label }: { label: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
      {label}
    </div>
  )
}

// Skeleton shown while the federated module is loading.
// "animate-pulse" makes the boxes fade in and out — classic loading state.
function TodoSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-xl bg-white p-6 shadow-sm">
      <div className="h-7 w-1/3 rounded bg-slate-200" />
      <div className="h-10 rounded bg-slate-200" />
      <div className="h-5 rounded bg-slate-200" />
      <div className="h-5 w-5/6 rounded bg-slate-200" />
      <div className="h-5 w-4/6 rounded bg-slate-200" />
    </div>
  )
}
