# 🧩 TodoFlow — Next.js 15 Microfrontend Federation

> Two independent Next.js 15 apps communicating in real time —
> **zero state management libraries, zero Context API, zero magic.**
> Just JavaScript, the browser, and Module Federation.

---

## The Philosophy

Most microfrontend tutorials reach for Zustand or Redux the moment state needs to cross an app boundary. That is the wrong instinct, and it teaches you nothing.

Before you can understand *why* those libraries exist, you must understand what they are built on top of. They are all — every single one — implementations of the same 15-line pattern: a value, a set of listeners, and a notify function. That pattern has a name: the **Observable**. It predates React, it predates npm, and it will outlast every state library you have ever used.

This project implements that pattern by hand. You will write the store primitive yourself. You will wire the event bus yourself. By the end you will look at Zustand's source code and think: "that's it?" — because it is.

---

## What You Will Learn

| Concept | Where You See It |
|---|---|
| Hand-rolled observable store (the core of all state libs) | `packages/mini-store` |
| Typed DOM Event Bus (no library, pure browser API) | `packages/event-bus` |
| Module Federation — exposes, remotes, singleton modules | `next.config.ts` in both apps |
| Next.js 15 App Router — Server vs Client Components | `apps/*/app/` directories |
| `ssr: false` dynamic imports at federation boundaries | `host-app/components/RemoteTodo.tsx` |
| React Suspense + Error Boundaries for remote failures | Wrapping every federated component |
| TypeScript `declare module` for unresolvable imports | `host-app/types/federation.d.ts` |
| Monorepo with pnpm workspaces + Turborepo | Root `pnpm-workspace.yaml`, `turbo.json` |
| Independent Docker deployment per MFE | `apps/*/Dockerfile` |

---

## Project Structure

```
todoflow/
├── apps/
│   ├── host-app/                   # Shell (Port 3000)
│   │   ├── app/
│   │   │   ├── layout.tsx          # Server Component — page chrome
│   │   │   ├── page.tsx            # Server Component — dashboard grid
│   │   │   └── components/
│   │   │       ├── RemoteTodo.tsx  # "use client" — federated import wrapper
│   │   │       ├── StatsPanel.tsx  # "use client" — subscribes to mini-store
│   │   │       └── ActivityFeed.tsx# "use client" — subscribes to event bus
│   │   ├── types/
│   │   │   └── federation.d.ts     # TypeScript declarations for remote modules
│   │   └── next.config.ts          # Federation CONSUMER config
│   │
│   └── remote-app/                 # Todo MFE (Port 3001)
│       ├── app/
│       │   ├── layout.tsx
│       │   └── page.tsx            # Standalone page — run this app in isolation
│       ├── components/
│       │   ├── TodoApp.tsx         # 🔑 The exposed root component
│       │   ├── TodoForm.tsx
│       │   ├── TodoList.tsx
│       │   └── TodoItem.tsx
│       └── next.config.ts          # Federation PRODUCER config
│
├── packages/
│   ├── mini-store/                 # Hand-rolled observable store (~30 lines)
│   │   └── src/
│   │       ├── createStore.ts      # The primitive: get / set / subscribe
│   │       ├── todoStore.ts        # The actual todo store instance
│   │       └── index.ts
│   │
│   └── event-bus/                  # Typed DOM CustomEvent pub/sub
│       └── src/
│           ├── EventBus.ts         # Singleton emitter/subscriber
│           ├── events.ts           # All typed event shapes
│           └── index.ts
│
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9 — `npm i -g pnpm`

### Install and run

```bash
git clone https://github.com/yourname/todoflow
cd todoflow
pnpm install
pnpm dev          # starts both apps in parallel
```

| URL | What's there |
|---|---|
| http://localhost:3000 | Host shell — dashboard with federated TodoApp, live stats, activity feed |
| http://localhost:3001 | Remote — the TodoApp running standalone (great for isolated dev) |

> Start `remote-app` first. The host fetches `remoteEntry.js` from port 3001 at load time.

---

## How the Two Apps Communicate

No libraries. No magic. Two channels, both hand-built.

```
┌────────────────────────────────────────────────────────────────┐
│                       host-app :3000                          │
│                                                               │
│   ┌─────────────────┐          ┌──────────────────────────┐  │
│   │   StatsPanel    │          │      ActivityFeed         │  │
│   │                 │          │                           │  │
│   │  store.subscribe│          │  eventBus.subscribe(...)  │  │
│   └────────┬────────┘          └────────────┬─────────────┘  │
│            │                               │                 │
└────────────┼───────────────────────────────┼─────────────────┘
             │                               │
             │  mini-store (exposed via      │  event-bus (exposed via
             │  federation, same JS object)  │  federation, same instance)
             │                               │
┌────────────┼───────────────────────────────┼─────────────────┐
│            │                               │                 │
│   ┌────────┴───────────────────────────────┴──────────────┐  │
│   │                     TodoApp                           │  │
│   │                                                       │  │
│   │   store.set(newTodos)   +   eventBus.emit(event)      │  │
│   └───────────────────────────────────────────────────────┘  │
│                       remote-app :3001                       │
└────────────────────────────────────────────────────────────────┘
```

### Channel 1 — Mini Store (shared observable state)

The remote owns the store and writes to it. The host imports the same store instance via federation and subscribes. Same object in memory — no polling, no REST, no overhead.

### Channel 2 — Event Bus (fire-and-forget notifications)

The remote emits a typed event on every action. The host subscribes and builds a live activity feed. The host does not need to store this data — it just reacts to the stream.

---

## The Core Insight

These two channels together cover every real-world cross-MFE communication need:

- **Need shared state both sides can read?** → Mini Store
- **Need to notify another app that something happened?** → Event Bus
- **Need bidirectional RPC-style calls?** → Event Bus with a reply event

No library gives you something you cannot build in an afternoon once you understand the primitive. This project is that afternoon.

---

## Scripts

```bash
pnpm dev                              # All apps in parallel
pnpm build                            # Full build (respects Turbo dep order)
pnpm type-check                       # tsc --noEmit everywhere
pnpm --filter host-app dev            # Host only
pnpm --filter remote-app dev          # Remote only
pnpm --filter @todoflow/mini-store build
```

---

## Tech Stack (deliberately minimal)

| Tool | Why |
|---|---|
| Next.js 15 | App Router, Server Components, streaming |
| React 19 | UI — no wrapping abstractions |
| TypeScript 5 | Strict mode across the monorepo |
| `@module-federation/nextjs-mf` | The federation plugin |
| Tailwind CSS 4 | Utility styling |
| pnpm workspaces | Monorepo |
| Turborepo | Build pipeline |

**Deliberately absent:** Zustand, Redux, MobX, Jotai, Recoil, Context API for state sharing.
