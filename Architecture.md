# 🏛️ Architecture — TodoFlow

## The Foundational Argument

Before reading a single config file, understand this: every state management library you have ever used is a wrapper around the same 15-line JavaScript primitive. Zustand, Redux, MobX, Jotai — strip away the API sugar and what remains is always:

```
1. A variable that holds state
2. A list of functions that want to be called when state changes
3. A function that updates the variable and calls all the listeners
```

That's it. That is the complete theory of state management. This project implements it directly. No wrappers. This means when you encounter a state library in a real codebase, you will understand it rather than depend on it.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [The Mini Store — Observable State From Scratch](#the-mini-store)
3. [The Event Bus — Typed DOM Events](#the-event-bus)
4. [Module Federation — How Two Apps Become One](#module-federation)
5. [Next.js 15 App Router Patterns](#nextjs-15-app-router-patterns)
6. [Monorepo & Build Pipeline](#monorepo--build-pipeline)
7. [TypeScript Strategy](#typescript-strategy)
8. [Deployment Model](#deployment-model)
9. [Decision Log](#decision-log)

---

## System Overview

Two independent Next.js 15 applications. Neither knows about the other at build time. At runtime, the browser stitches them together via Module Federation — loading `TodoApp` from `remote-app` into `host-app` as if it were a local component.

```
BUILD TIME                          RUNTIME (browser)
──────────                          ─────────────────

host-app build                      host-app :3000
  (no knowledge of remote)    ─────>  fetches remoteEntry.js from :3001
                                      loads TodoApp chunk
remote-app build                      renders <TodoApp /> inline
  (no knowledge of host)       ─────>  mini-store & event-bus shared as
                                      single JS objects in memory
```

### What Each App Owns

| Concern | Owner |
|---|---|
| Todo business logic | `remote-app` |
| Todo UI components | `remote-app` |
| Store write operations | `remote-app` (only writer) |
| Dashboard layout & chrome | `host-app` |
| Stats display | `host-app` (reads store) |
| Activity feed | `host-app` (subscribes to events) |
| mini-store primitive | `packages/mini-store` (shared) |
| Event bus primitive | `packages/event-bus` (shared) |

---

## The Mini Store

### The 30-Line Heart of All State Management

```ts
// packages/mini-store/src/createStore.ts

type Listener<T> = (state: T) => void;
type Setter<T> = T | ((prev: T) => T);

export interface Store<T> {
  get: () => T;
  set: (next: Setter<T>) => void;
  subscribe: (listener: Listener<T>) => () => void; // returns unsubscribe fn
}

export function createStore<T>(initialState: T): Store<T> {
  let state = initialState;
  const listeners = new Set<Listener<T>>();

  return {
    get() {
      return state;
    },

    set(next) {
      // Support both direct values and updater functions (like React's setState)
      state = typeof next === 'function'
        ? (next as (prev: T) => T)(state)
        : next;

      // Notify every subscriber synchronously
      listeners.forEach(listener => listener(state));
    },

    subscribe(listener) {
      listeners.add(listener);
      // Return a cleanup function — critical for useEffect
      return () => listeners.delete(listener);
    },
  };
}
```

Read that again. That is the complete implementation. There is no missing piece.

Now compare to Zustand's core. Zustand adds:
- A `getState` / `setState` / `subscribe` API (same shape, different names)
- React hooks as syntactic sugar (`useSyncExternalStore` under the hood)
- Middleware support (devtools, persist, immer)

Everything else Zustand offers is convenience. The primitive is identical.

### The Actual Todo Store

```ts
// packages/mini-store/src/todoStore.ts
import { createStore } from './createStore';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

// Create the store with initial state
export const todoStore = createStore<TodoState>({
  todos: [],
  filter: 'all',
});

// Actions are plain functions — they call store.set()
// No action creators, no dispatch, no reducers. Just functions.

export const todoActions = {
  addTodo(text: string, priority: Todo['priority'] = 'medium') {
    todoStore.set(prev => ({
      ...prev,
      todos: [
        ...prev.todos,
        {
          id: crypto.randomUUID(),
          text,
          completed: false,
          priority,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  },

  toggleTodo(id: string) {
    todoStore.set(prev => ({
      ...prev,
      todos: prev.todos.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    }));
  },

  deleteTodo(id: string) {
    todoStore.set(prev => ({
      ...prev,
      todos: prev.todos.filter(t => t.id !== id),
    }));
  },

  setFilter(filter: TodoState['filter']) {
    todoStore.set(prev => ({ ...prev, filter }));
  },

  clearCompleted() {
    todoStore.set(prev => ({
      ...prev,
      todos: prev.todos.filter(t => !t.completed),
    }));
  },
};
```

### Using the Store in React (No Hook Library Needed)

React 18+ ships `useSyncExternalStore` — a first-class hook designed exactly for subscribing to external stores. We do not need Zustand to connect our store to React:

```ts
// packages/mini-store/src/useStore.ts
import { useSyncExternalStore } from 'react';
import type { Store } from './createStore';

export function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,           // subscribe fn — React calls this
    () => selector(store.get()), // getSnapshot — React calls this for current value
    () => selector(store.get()), // getServerSnapshot — called during SSR
  );
}
```

`useSyncExternalStore` is the official React API for connecting external (non-React) state to React components with proper concurrent mode support. This is what Zustand calls internally. We are calling it directly.

Usage in a component:

```tsx
// In StatsPanel (host-app) — reads remote's store
import { useStore } from '@todoflow/mini-store';
import { todoStore } from 'remoteApp/todoStore'; // federated import

export function StatsPanel() {
  const todos = useStore(todoStore, s => s.todos);
  const completed = todos.filter(t => t.completed).length;

  return <div>...</div>;
}
```

### Why This Architecture Beats a Library Here

- You see `useSyncExternalStore` directly — the React primitive that all external state libraries are built on
- Actions are plain functions — no dispatch, no reducers, no ceremony
- The store is a plain JS object — easy to expose via Module Federation as-is
- Zero bundle overhead — this whole package is ~30 lines

---

## The Event Bus

### Why Two Channels?

The store handles **state** — data that both apps need to access at any time. The event bus handles **events** — things that happened, which the host wants to react to immediately but does not need to store.

Think of it like this:
- The store is a **whiteboard** — both apps can read what's currently written
- The event bus is a **loudspeaker** — the remote announces something, host apps react

### Implementation

```ts
// packages/event-bus/src/events.ts

// TypeScript discriminated union — exhaustive type checking on event.type
export type TodoEvent =
  | { type: 'TODO_ADDED';        payload: { id: string; text: string; priority: string } }
  | { type: 'TODO_TOGGLED';      payload: { id: string; completed: boolean } }
  | { type: 'TODO_DELETED';      payload: { id: string } }
  | { type: 'FILTER_CHANGED';    payload: { filter: string } }
  | { type: 'CLEARED_COMPLETED'; payload: { count: number } };
```

```ts
// packages/event-bus/src/EventBus.ts
import type { TodoEvent } from './events';

const CHANNEL = 'todoflow:event';

export class EventBus {
  // Singleton — one instance shared across the whole browser session
  private static instance: EventBus;

  static getInstance(): EventBus {
    if (!EventBus.instance) EventBus.instance = new EventBus();
    return EventBus.instance;
  }

  emit(event: TodoEvent): void {
    if (typeof window === 'undefined') return; // Guard: no-op during SSR
    window.dispatchEvent(
      new CustomEvent(CHANNEL, { detail: event })
    );
  }

  subscribe(handler: (event: TodoEvent) => void): () => void {
    const listener = (e: Event) =>
      handler((e as CustomEvent<TodoEvent>).detail);

    window.addEventListener(CHANNEL, listener);

    // Return cleanup — always used in useEffect's return value
    return () => window.removeEventListener(CHANNEL, listener);
  }
}
```

### Why DOM CustomEvents?

`window.dispatchEvent` with a `CustomEvent` is the native browser pub/sub mechanism. It:
- Requires zero dependencies
- Is inspectable in browser DevTools (Event Listeners panel)
- Works across any JS running in the same browser tab — including federated modules
- Has been in every browser since IE9

Every pub/sub library (EventEmitter, mitt, tiny-emitter) is a polished API over this same idea. Here we use the raw API so you understand what those libraries wrap.

### Consuming Events in React

```tsx
// host-app/components/ActivityFeed.tsx
"use client";
import { useEffect, useState, useCallback } from 'react';
import { EventBus } from 'remoteApp/EventBus'; // imported from remote via federation
import type { TodoEvent } from '@todoflow/event-bus';

type FeedItem = { id: string; message: string; time: string };

function describeEvent(event: TodoEvent): string {
  // TypeScript ensures we handle EVERY event type (exhaustive switch)
  switch (event.type) {
    case 'TODO_ADDED':        return `Added: "${event.payload.text}"`;
    case 'TODO_TOGGLED':      return event.payload.completed ? 'Completed a todo' : 'Reopened a todo';
    case 'TODO_DELETED':      return 'Deleted a todo';
    case 'FILTER_CHANGED':    return `Filter → ${event.payload.filter}`;
    case 'CLEARED_COMPLETED': return `Cleared ${event.payload.count} completed todos`;
  }
}

export function ActivityFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  const handleEvent = useCallback((event: TodoEvent) => {
    setFeed(prev =>
      [{ id: crypto.randomUUID(), message: describeEvent(event), time: new Date().toLocaleTimeString() },
       ...prev].slice(0, 20) // cap at 20 items
    );
  }, []);

  useEffect(() => {
    const unsubscribe = EventBus.getInstance().subscribe(handleEvent);
    return unsubscribe; // cleanup: removes window event listener on unmount
  }, [handleEvent]);

  return (/* render feed */);
}
```

---

## Module Federation

### The Key Insight

Module Federation does not move code between apps. It makes the browser **load JavaScript from a remote server at runtime** and treat it as if it were a local module. The two apps share the same JavaScript objects in memory.

This is why the mini-store singleton works: both apps reference the exact same store object. When remote-app calls `store.set()`, host-app's `store.subscribe()` callback fires — because they are literally the same function on the same object.

### Remote Producer Config

```ts
// apps/remote-app/next.config.ts
import { NextFederationPlugin } from '@module-federation/nextjs-mf';

export default {
  webpack(config, options) {
    if (!options.isServer) { // Federation is client-side only
      config.plugins.push(
        new NextFederationPlugin({
          name: 'remoteApp',
          filename: 'static/chunks/remoteEntry.js',

          exposes: {
            // key      = import path the host will use
            // value    = actual file in this app
            './TodoApp':    './components/TodoApp',
            './todoStore':  './store/todoStore',   // the store INSTANCE
            './EventBus':   './lib/EventBus',      // the bus SINGLETON
          },

          shared: {
            react:     { singleton: true, requiredVersion: false },
            'react-dom': { singleton: true, requiredVersion: false },
            // No zustand here — we don't use it
          },
        })
      );
    }
    return config;
  },

  async headers() {
    return [{
      source: '/_next/static/chunks/remoteEntry.js',
      headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
    }];
  },
};
```

### Host Consumer Config

```ts
// apps/host-app/next.config.ts
import { NextFederationPlugin } from '@module-federation/nextjs-mf';

export default {
  webpack(config, options) {
    if (!options.isServer) {
      config.plugins.push(
        new NextFederationPlugin({
          name: 'hostApp',
          remotes: {
            // 'remoteApp' becomes the namespace in imports:
            // import X from 'remoteApp/TodoApp'
            remoteApp: `remoteApp@${
              process.env.REMOTE_URL ?? 'http://localhost:3001'
            }/_next/static/chunks/remoteEntry.js`,
          },
          shared: {
            react:     { singleton: true, requiredVersion: false },
            'react-dom': { singleton: true, requiredVersion: false },
          },
        })
      );
    }
    return config;
  },
};
```

### The singleton: true Rule

This is the single most important configuration line in the entire project. Without it:

```
remote-app bundles its own React (instance A)
host-app bundles its own React (instance B)

Hooks crash — "hooks can only be called inside a function component"
because the component was created with React A but rendered with React B
```

With `singleton: true`, Webpack's federation runtime negotiates: "I have React 19.0.0, you have React 19.0.0 — use one copy." Both apps run on the same React instance. Same logic applies to any library that maintains global state (and this is exactly why Zustand requires it too).

### The Federated Import Wrapper

```tsx
// host-app/app/components/RemoteTodo.tsx
"use client"; // mandatory — dynamic imports only work in Client Components

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// ssr: false is NON-NEGOTIABLE
// remoteEntry.js is fetched from localhost:3001 at runtime in the browser.
// The server has no access to that URL during SSR.
// Attempting SSR on a federated import = instant fatal error.
const RemoteTodoApp = dynamic(
  () => import('remoteApp/TodoApp'),
  { ssr: false }
);

export function RemoteTodo() {
  return (
    <ErrorBoundary fallback={<RemoteDownBanner />}>
      <Suspense fallback={<TodoSkeleton />}>
        <RemoteTodoApp />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## Next.js 15 App Router Patterns

### Server vs Client — The Rule That Matters

```
Server Component          Client Component
─────────────────         ────────────────
Runs on server            Runs in browser
Zero JS to client         Sends JS bundle
Cannot use hooks          Can use hooks
Cannot use browser APIs   Can use browser APIs
Cannot load federated     Can load federated modules
modules
```

The dashboard page is a Server Component. It renders the grid layout, sends HTML to the browser instantly, and delegates interactive slots to Client Components. Those Client Components load the federated bundle asynchronously.

### Component Boundary Map

```
app/layout.tsx                    Server — nav shell, no interactivity
  └── app/page.tsx                Server — dashboard grid layout
        ├── StatsPanel.tsx        Client — subscribes to mini-store
        ├── ActivityFeed.tsx      Client — subscribes to event bus
        └── RemoteTodo.tsx        Client — loads federated component
              └── <Suspense>
                    └── <ErrorBoundary>
                          └── <RemoteTodoApp>   federated, lazy, browser-only
```

The Server Components ship zero JavaScript. The Client Components ship their bundle. The federated component arrives as a third, separate chunk from port 3001.

### Streaming

Next.js 15 streams the Server Component HTML immediately. The `<Suspense>` boundaries in the page let the browser receive and render the dashboard shell while the federated chunk is still loading. Users see content in under 100ms even if the Todo MFE takes a second to load.

---

## Monorepo & Build Pipeline

### Package Dependency Graph

```
packages/mini-store    packages/event-bus
        │                      │
        └──────────┬───────────┘
                   │
         apps/remote-app          (writes to store, emits events)
                   │
         (exposed via federation at runtime)
                   │
         apps/host-app            (reads store, listens to events)
```

### Turborepo Pipeline

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

`"^build"` means: before building me, build all packages I depend on. Turborepo reads the `package.json` dependency graph and executes in the correct order automatically.

---

## TypeScript Strategy

### The Problem With Federated Imports

TypeScript's compiler runs at build time. `import('remoteApp/TodoApp')` does not exist in `node_modules`. The compiler rejects it:

```
Cannot find module 'remoteApp/TodoApp' or its corresponding type declarations.
```

### The Solution: Ambient Module Declarations

```ts
// apps/host-app/types/federation.d.ts

import type { Store } from '@todoflow/mini-store';
import type { TodoState } from '@todoflow/mini-store';
import type { EventBus } from '@todoflow/event-bus';

declare module 'remoteApp/TodoApp' {
  const TodoApp: React.FC;
  export default TodoApp;
}

declare module 'remoteApp/todoStore' {
  export const todoStore: Store<TodoState>;
}

declare module 'remoteApp/EventBus' {
  export { EventBus };
}
```

This file tells the TypeScript compiler: "trust me, these modules exist at runtime — here are their types." You get full autocomplete and type checking across the federation boundary without any actual build-time connection.

---

## Deployment Model

### Independence Is the Point

```
remote-app CI/CD                   host-app CI/CD
─────────────────                  ────────────────
git push remote-app                git push host-app
  └── build image                    └── build image
  └── push to registry               └── push to registry
  └── deploy to K8s/Fly              └── deploy to K8s/Fly
  └── serves remoteEntry.js          └── reads REMOTE_URL env var
                                         points to new remote deploy
```

The host never rebuilds when the remote deploys. The host fetches the new `remoteEntry.js` on the next page load. This is how microfrontends enable independent team releases with zero coordination.

---

## Decision Log

### Why no Zustand / Redux / Context?

Because understanding the primitive is more valuable than knowing any specific library's API. `createStore` in this project is 30 lines. Zustand's core is about 80. Once you have read both, the gap between them is obvious and small. After this project, picking up Zustand takes 10 minutes — not because you memorised its API, but because you understand what it is.

### Why DOM CustomEvents over a library (mitt, tiny-emitter)?

`window.dispatchEvent(new CustomEvent(...))` is the API those libraries wrap. Using it directly means you understand the mechanism. The only thing libraries add is a cleaner API and the ability to run in Node (where `window` doesn't exist). Neither matters here.

### Why `useSyncExternalStore` over `useState` + `useEffect`?

`useState` + `useEffect` for external store subscriptions has a known bug in React's concurrent mode: the component can render with stale state between the `useEffect` subscription and the re-render. `useSyncExternalStore` is React's official, concurrent-safe API for this exact use case. Using it directly is better than using any library that wraps it — and more educational.

### Why pnpm workspaces over npm workspaces?

pnpm's `workspace:*` protocol links packages by symlink with content-addressed storage. It is faster and more disk-efficient than npm or yarn. More importantly for learning: the link between packages is explicit and visible in `package.json`, making the dependency graph easy to reason about.

### Why not share everything via federation?

Over-exposing via federation creates invisible coupling between teams and apps. The rule: **only expose what the consuming app genuinely cannot own**. In this project that is: the TodoApp UI (the host can't own it — the remote does), the store instance (must be the same object), and the event bus singleton (must be the same instance). Internal components (`TodoItem`, `TodoForm`) are private implementation details of the remote.
