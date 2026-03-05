# 📋 PLAN — Pull Request Roadmap

> Work through these PRs in order. Each one introduces exactly one concept.
> This is the discipline that separates engineers who understand systems
> from engineers who copy-paste until something works.

---

## PR Overview

| # | Title | Core Concept | Time |
|---|---|---|---|
| PR-01 | Monorepo Skeleton | pnpm workspaces, Turborepo, shared tsconfig | 30 min |
| PR-02 | The Mini Store Primitive | `createStore`, `useSyncExternalStore`, observable pattern | 45 min |
| PR-03 | The Event Bus | DOM CustomEvents, typed discriminated unions, singleton | 30 min |
| PR-04 | Remote App — Todo MFE | Next.js 15 App Router, Client Components, standalone todo | 45 min |
| PR-05 | Host App — Shell | Server Components, dashboard layout, Suspense boundaries | 30 min |
| PR-06 | Module Federation Wiring | `exposes`, `remotes`, `singleton`, `ssr: false` | 60 min |
| PR-07 | Cross-App State (Mini Store) | Expose store via federation, `useSyncExternalStore` in host | 45 min |
| PR-08 | Cross-App Events (Event Bus) | Expose bus via federation, subscribe in host | 30 min |
| PR-09 | Error Boundaries & Resilience | `ErrorBoundary`, graceful degradation, retry pattern | 30 min |
| PR-10 | TypeScript Strictness & Polish | `federation.d.ts`, strict mode, accessibility, Docker | 45 min |

**Total: ~6 hours.** A focused weekend.

---

## PR-01 — Monorepo Skeleton

### Goal
Establish the project structure before writing a single line of application code. Getting this right upfront means every subsequent PR has a clean home. Getting it wrong means refactoring pain later.

### What Gets Created

```
todoflow/
├── apps/
│   ├── host-app/         # placeholder package.json
│   └── remote-app/       # placeholder package.json
├── packages/
│   ├── mini-store/       # placeholder
│   └── event-bus/        # placeholder
├── package.json          # root workspace
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json    # shared compiler config
```

### Key Files

**`pnpm-workspace.yaml`**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**`turbo.json`**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev":        { "cache": false, "persistent": true },
    "lint":       {},
    "type-check": { "dependsOn": ["^build"] }
  }
}
```

**`tsconfig.base.json`**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true
  }
}
```

Each app and package will have its own `tsconfig.json` that extends this base with `"extends": "../../tsconfig.base.json"`.

### What You Learn
- `pnpm-workspace.yaml` is the single source of truth for which directories are packages
- `dependsOn: ["^build"]` means Turborepo will build all my dependencies before building me — no manual ordering needed
- Shared `tsconfig.base.json` enforces consistent compiler settings without duplication
- `workspace:*` in `package.json` dependencies resolves to the local package via symlink at install time

### Acceptance Criteria
- [ ] `pnpm install` from root succeeds
- [ ] `pnpm build` from root exits cleanly (nothing to build yet, no crash)
- [ ] `ls node_modules/@todoflow` shows symlinks to local packages

---

## PR-02 — The Mini Store Primitive

### Goal
Implement the hand-rolled observable store. This is the most important PR in the project — not because it is complex, but because it makes everything explicit. Once you have written this, you will never look at a state management library the same way.

### What Gets Created

```
packages/mini-store/
├── src/
│   ├── createStore.ts      # The 30-line primitive
│   ├── useStore.ts         # useSyncExternalStore hook bridge
│   ├── todoStore.ts        # The actual store + actions
│   └── index.ts
├── package.json
└── tsconfig.json
```

### The Complete Implementation

**`src/createStore.ts`**
```ts
type Listener<T> = (state: T) => void;
type Setter<T> = T | ((prev: T) => T);

export interface Store<T> {
  get: () => T;
  set: (next: Setter<T>) => void;
  subscribe: (listener: Listener<T>) => () => void;
}

export function createStore<T>(initialState: T): Store<T> {
  let state = initialState;
  const listeners = new Set<Listener<T>>();

  return {
    get: () => state,

    set(next) {
      state = typeof next === 'function'
        ? (next as (prev: T) => T)(state)
        : next;
      listeners.forEach(fn => fn(state));
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
```

**`src/useStore.ts`** — The bridge between our store and React:
```ts
import { useSyncExternalStore } from 'react';
import type { Store } from './createStore';

export function useStore<T, S>(
  store: Store<T>,
  selector: (state: T) => S
): S {
  return useSyncExternalStore(
    store.subscribe,               // React calls this to subscribe
    () => selector(store.get()),   // React calls this to read current value
    () => selector(store.get()),   // React calls this on server (SSR)
  );
}
```

Why `useSyncExternalStore` and not `useState` + `useEffect`? Because `useEffect` runs *after* render. In React 18+ concurrent mode, a component can render, then React pauses, then the external store updates, then React resumes — resulting in the component rendering with stale data. `useSyncExternalStore` is React's concurrent-safe primitive for external subscriptions. Zustand uses this exact API internally. We are using it directly.

**`src/todoStore.ts`**
```ts
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

export const todoStore = createStore<TodoState>({
  todos: [],
  filter: 'all',
});

export const todoActions = {
  addTodo(text: string, priority: Todo['priority'] = 'medium') {
    todoStore.set(prev => ({
      ...prev,
      todos: [...prev.todos, {
        id: crypto.randomUUID(),
        text,
        completed: false,
        priority,
        createdAt: new Date().toISOString(),
      }],
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
    const completed = todoStore.get().todos.filter(t => t.completed).length;
    todoStore.set(prev => ({
      ...prev,
      todos: prev.todos.filter(t => !t.completed),
    }));
    return completed; // return count so event bus can use it
  },
};
```

### What You Learn
- Why `Set<Listener>` and not `Array<Listener>` — `Set` handles duplicate subscriptions and O(1) deletion
- Why subscribe returns an unsubscribe function — the standard cleanup pattern used everywhere in the browser (EventTarget, IntersectionObserver, etc.)
- Why `typeof next === 'function'` — supporting updater functions (`set(prev => ...)`) is necessary to avoid closure stale-state bugs
- `useSyncExternalStore` — React's official hook for subscribing to external stores in concurrent mode
- Why actions are plain functions, not a class, not a reducer — simplicity wins

### Acceptance Criteria
- [ ] `pnpm --filter @todoflow/mini-store build` succeeds
- [ ] Write a quick test: `store.set({ todos: [], filter: 'all' })` → listener fires with new state
- [ ] `useStore(todoStore, s => s.todos)` works in a React component without errors

---

## PR-03 — The Event Bus

### Goal
Build the typed event pub/sub system using nothing but `window.dispatchEvent` and `CustomEvent`. This is the second communication channel — used for fire-and-forget notifications rather than shared state.

### What Gets Created

```
packages/event-bus/
├── src/
│   ├── events.ts       # All typed event definitions
│   ├── EventBus.ts     # Singleton emitter/subscriber
│   └── index.ts
├── package.json
└── tsconfig.json
```

### The Complete Implementation

**`src/events.ts`**
```ts
// TypeScript discriminated union — every event type is distinct and exhaustive
export type TodoEvent =
  | { type: 'TODO_ADDED';        payload: { id: string; text: string; priority: string } }
  | { type: 'TODO_TOGGLED';      payload: { id: string; completed: boolean } }
  | { type: 'TODO_DELETED';      payload: { id: string } }
  | { type: 'FILTER_CHANGED';    payload: { filter: string } }
  | { type: 'CLEARED_COMPLETED'; payload: { count: number } };
```

**`src/EventBus.ts`**
```ts
import type { TodoEvent } from './events';

const CHANNEL = 'todoflow:event';

export class EventBus {
  private static instance: EventBus;

  static getInstance(): EventBus {
    if (!EventBus.instance) EventBus.instance = new EventBus();
    return EventBus.instance;
  }

  emit(event: TodoEvent): void {
    if (typeof window === 'undefined') return; // no-op during SSR
    window.dispatchEvent(new CustomEvent(CHANNEL, { detail: event }));
  }

  subscribe(handler: (event: TodoEvent) => void): () => void {
    const listener = (e: Event) =>
      handler((e as CustomEvent<TodoEvent>).detail);
    window.addEventListener(CHANNEL, listener);
    return () => window.removeEventListener(CHANNEL, listener);
  }
}
```

### The Discriminated Union Advantage

When you switch on `event.type` in TypeScript, the compiler narrows `event.payload` to the exact type for that branch:

```ts
switch (event.type) {
  case 'TODO_ADDED':
    event.payload.text;  // ✅ TypeScript knows this exists
    break;
  case 'TODO_DELETED':
    event.payload.text;  // ❌ TypeScript error — no text on DELETE payload
    break;
}
```

Add a new event type? TypeScript will error on every switch statement that does not handle it. Exhaustive checking catches missing cases at compile time.

### What You Learn
- `CustomEvent` — the native browser event with an arbitrary `detail` payload
- Why `typeof window === 'undefined'` guard — Next.js runs code on the server during SSR; `window` does not exist there
- TypeScript discriminated unions — the most powerful form of type narrowing
- Singleton pattern — one instance shared across all code in the browser session
- The cleanup pattern — `subscribe` returns `() => removeEventListener(...)` for use in `useEffect`

### Acceptance Criteria
- [ ] `pnpm --filter @todoflow/event-bus build` succeeds
- [ ] `bus.emit({ type: 'TODO_ADDED', payload: { id: '1', text: 'test', priority: 'low' } })` works
- [ ] `bus.subscribe(handler)` fires the handler when emit is called
- [ ] Calling the returned cleanup function stops the handler from firing

---

## PR-04 — Remote App: Todo MFE

### Goal
Build `remote-app` as a fully standalone Next.js 15 application. No federation yet. Just a working Todo app at port 3001 using the mini-store and event bus packages. The federation wiring comes in PR-06.

### What Gets Created

```
apps/remote-app/
├── app/
│   ├── layout.tsx
│   └── page.tsx              # Renders <TodoApp /> — for isolated dev
├── components/
│   ├── TodoApp.tsx           # Root component (will be exposed in PR-06)
│   ├── TodoForm.tsx          # Input + submit
│   ├── TodoList.tsx          # Filtered list
│   └── TodoItem.tsx          # Single item: toggle, delete, priority badge
├── next.config.ts            # Plain config — no federation yet
├── package.json
└── tsconfig.json
```

### Key Decisions Made Here

**`components/TodoApp.tsx`** must be a Client Component:
```tsx
"use client"; // required: uses store (hooks), event handlers, browser APIs

import { useStore } from '@todoflow/mini-store';
import { todoStore, todoActions } from '@todoflow/mini-store';
import { TodoForm } from './TodoForm';
import { TodoList } from './TodoList';

export default function TodoApp() {
  const filter = useStore(todoStore, s => s.filter);

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Todos</h1>
      </header>
      <TodoForm />
      <nav className="flex gap-2">
        {(['all', 'active', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => todoActions.setFilter(f)}
            className={filter === f ? 'font-bold underline' : ''}
          >
            {f}
          </button>
        ))}
      </nav>
      <TodoList />
    </div>
  );
}
```

**`components/TodoForm.tsx`** — emits event bus event after adding:
```tsx
"use client";
import { useRef } from 'react';
import { todoActions } from '@todoflow/mini-store';
import { EventBus } from '@todoflow/event-bus';

export function TodoForm() {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = inputRef.current?.value.trim();
    if (!text) return;

    // 1. Update the store
    todoActions.addTodo(text);

    // 2. Emit an event (host-app's ActivityFeed will pick this up)
    // Get the id we just created — or pass it from addTodo's return value
    const latest = todoStore.get().todos.at(-1)!;
    EventBus.getInstance().emit({
      type: 'TODO_ADDED',
      payload: { id: latest.id, text: latest.text, priority: latest.priority },
    });

    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input ref={inputRef} placeholder="What needs doing?" className="flex-1 border rounded px-3 py-2" />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
    </form>
  );
}
```

### What You Learn
- Why `"use client"` is required on any component that uses hooks, event handlers, or browser APIs
- That Server Components cannot import Client Components that use browser APIs — the boundary propagates downward
- How to use `useStore` with a selector (`s => s.filter`) to subscribe to only part of the state
- How actions and events work together: store update first, then event emission
- Why `todoStore.get().todos.at(-1)` — reading current store state synchronously after a set

### Acceptance Criteria
- [ ] `pnpm --filter remote-app dev` starts on port 3001
- [ ] http://localhost:3001 shows a working Todo app
- [ ] Can add, toggle, delete todos — all state correct
- [ ] Filter buttons show only the right todos
- [ ] TypeScript: zero errors

---

## PR-05 — Host App: Shell

### Goal
Build `host-app` as a standalone Next.js 15 application with the dashboard layout and placeholder panels. No federation yet — the panels show static or empty content. Focus is on the Server Component architecture and layout structure.

### What Gets Created

```
apps/host-app/
├── app/
│   ├── layout.tsx            # Root layout: nav bar, body
│   ├── page.tsx              # Dashboard — Server Component
│   └── components/
│       ├── RemoteTodo.tsx    # Placeholder for now ("Coming in PR-06")
│       ├── StatsPanel.tsx    # Placeholder — hardcoded zeros
│       └── ActivityFeed.tsx  # Placeholder — empty list
├── types/
│   └── federation.d.ts       # Empty for now — filled in PR-06/07/08
├── next.config.ts
├── package.json
└── tsconfig.json
```

### Key Implementation

**`app/page.tsx`** — pure Server Component:
```tsx
// No "use client" — this is a Server Component
// React renders this on the server; zero JS ships to the browser for this file
import { Suspense } from 'react';
import { StatsPanel } from './components/StatsPanel';
import { ActivityFeed } from './components/ActivityFeed';
import { RemoteTodo } from './components/RemoteTodo';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">
        TodoFlow Dashboard
      </h1>

      <div className="grid grid-cols-12 gap-6">

        <aside className="col-span-3 space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Stats</h2>
          <StatsPanel />
        </aside>

        <section className="col-span-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Todos</h2>
          <Suspense fallback={<div className="animate-pulse h-64 bg-slate-200 rounded-xl" />}>
            <RemoteTodo />
          </Suspense>
        </section>

        <aside className="col-span-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Activity</h2>
          <ActivityFeed />
        </aside>

      </div>
    </main>
  );
}
```

### What You Learn
- Server Components ship zero JS to the browser — the page shell renders server-side with no client bundle
- `Suspense` in the App Router enables streaming: server sends the shell HTML immediately, browser fills in the suspended slot when the async content resolves
- A Server Component can render Client Component children — the boundary flows one way (server → client), never the other
- Why `<Suspense>` wraps `<RemoteTodo>` even at this stage: it prepares the boundary that PR-06 will use for the federated load

### Acceptance Criteria
- [ ] `pnpm --filter host-app dev` starts on port 3000
- [ ] Three-column dashboard layout renders correctly
- [ ] Placeholder panels are visible
- [ ] Zero TypeScript errors

---

## PR-06 — Module Federation Wiring

### Goal
Connect the two apps. After this PR, `TodoApp` renders inside `host-app` — loaded at runtime from port 3001 via `remoteEntry.js`. The stats and activity feed are still placeholders; those come in PRs 07 and 08.

### What Changes

Install the plugin in both apps:
```bash
pnpm --filter remote-app add @module-federation/nextjs-mf
pnpm --filter host-app   add @module-federation/nextjs-mf
```

**`apps/remote-app/next.config.ts`** — become a producer:
```ts
import { NextFederationPlugin } from '@module-federation/nextjs-mf';

export default {
  webpack(config, options) {
    if (!options.isServer) {
      config.plugins.push(new NextFederationPlugin({
        name: 'remoteApp',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './TodoApp': './components/TodoApp',
          // Store and EventBus added in PR-07 and PR-08
        },
        shared: {
          react:       { singleton: true, requiredVersion: false },
          'react-dom': { singleton: true, requiredVersion: false },
        },
      }));
    }
    return config;
  },
  async headers() {
    return [{ source: '/_next/static/chunks/remoteEntry.js',
              headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }] }];
  },
};
```

**`apps/host-app/next.config.ts`** — become a consumer:
```ts
import { NextFederationPlugin } from '@module-federation/nextjs-mf';

export default {
  webpack(config, options) {
    if (!options.isServer) {
      config.plugins.push(new NextFederationPlugin({
        name: 'hostApp',
        remotes: {
          remoteApp: `remoteApp@${
            process.env.REMOTE_URL ?? 'http://localhost:3001'
          }/_next/static/chunks/remoteEntry.js`,
        },
        shared: {
          react:       { singleton: true, requiredVersion: false },
          'react-dom': { singleton: true, requiredVersion: false },
        },
      }));
    }
    return config;
  },
};
```

**`apps/host-app/app/components/RemoteTodo.tsx`** — replace placeholder:
```tsx
"use client";
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const RemoteTodoApp = dynamic(
  () => import('remoteApp/TodoApp'),
  { ssr: false }   // MANDATORY — remote JS is browser-only
);

export function RemoteTodo() {
  return (
    <Suspense fallback={<TodoSkeleton />}>
      <RemoteTodoApp />
    </Suspense>
  );
}

function TodoSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-xl bg-white p-6 shadow-sm">
      <div className="h-8 w-1/3 rounded bg-slate-200" />
      <div className="h-10 rounded bg-slate-200" />
      <div className="h-6 rounded bg-slate-200" />
      <div className="h-6 w-5/6 rounded bg-slate-200" />
      <div className="h-6 w-4/6 rounded bg-slate-200" />
    </div>
  );
}
```

**`apps/host-app/types/federation.d.ts`** — tell TypeScript this module exists:
```ts
declare module 'remoteApp/TodoApp' {
  const TodoApp: React.FC;
  export default TodoApp;
}
```

### The Four Gotchas — Explained Here So You Don't Lose Hours

**1. Why `if (!options.isServer)`?**
Federation is a browser runtime feature. The Webpack build for the server-side render should not include it. `options.isServer` is `true` when Next.js is building the server bundle.

**2. Why `ssr: false` on the dynamic import?**
At SSR time, the Next.js server tries to evaluate `import('remoteApp/TodoApp')`. But `remoteEntry.js` lives at `http://localhost:3001` — the Node.js server has no browser to fetch it with. This crashes. `ssr: false` tells Next.js: render a placeholder on the server, load the real component in the browser.

**3. Why `singleton: true` on React?**
If both apps bundle their own React, hooks break. A component created with React instance A cannot render into a tree owned by React instance B. `singleton: true` instructs the federation runtime: negotiate a single shared copy.

**4. Why `Access-Control-Allow-Origin: *` on remoteEntry.js?**
The browser blocks cross-origin JavaScript loads by default. The host at port 3000 fetching JS from port 3001 is cross-origin. The remote must explicitly permit this.

### Acceptance Criteria
- [ ] `pnpm dev` starts both apps
- [ ] http://localhost:3000 renders the `TodoApp` inside the host dashboard
- [ ] Browser Network tab shows a request to `localhost:3001/_next/static/chunks/remoteEntry.js`
- [ ] Adding a todo in the federated component works
- [ ] Zero TypeScript errors

---

## PR-07 — Cross-App State via Mini Store

### Goal
Expose the mini store from `remote-app` via federation. The `host-app` imports the same store instance and subscribes with `useStore`. Stats update in real time with every todo action — no polling, no REST call, no state library.

### What Changes

**`apps/remote-app/next.config.ts`** — add store to exposes:
```ts
exposes: {
  './TodoApp':   './components/TodoApp',
  './todoStore': './store/todoStore',   // re-exports todoStore + todoActions
},
```

**`apps/remote-app/store/todoStore.ts`** — thin re-export:
```ts
// Re-export from the package so federation exposes the package's singleton
export { todoStore, todoActions, useStore } from '@todoflow/mini-store';
export type { Todo, TodoState } from '@todoflow/mini-store';
```

**`apps/host-app/types/federation.d.ts`** — add types:
```ts
declare module 'remoteApp/TodoApp' {
  const TodoApp: React.FC;
  export default TodoApp;
}

declare module 'remoteApp/todoStore' {
  export { todoStore, useStore } from '@todoflow/mini-store';
  export type { Todo, TodoState } from '@todoflow/mini-store';
}
```

**`apps/host-app/app/components/StatsPanel.tsx`**:
```tsx
"use client";
import { useStore } from '@todoflow/mini-store';
import { todoStore } from 'remoteApp/todoStore'; // ← same object as remote's store

export function StatsPanel() {
  // useStore uses useSyncExternalStore internally
  // This component re-renders ONLY when the selected value changes
  const todos     = useStore(todoStore, s => s.todos);
  const total     = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const pending   = total - completed;
  const highPrio  = todos.filter(t => t.priority === 'high' && !t.completed).length;

  return (
    <div className="space-y-2">
      <Stat label="Total"          value={total}     color="slate" />
      <Stat label="Completed"      value={completed}  color="green" />
      <Stat label="Pending"        value={pending}    color="yellow" />
      <Stat label="High Priority"  value={highPrio}   color="red" />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex justify-between rounded-lg bg-white p-3 shadow-sm border-l-4 border-${color}-500`}>
      <span className="text-sm text-slate-600">{label}</span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  );
}
```

### The Singleton Reality Check

This PR makes the singleton nature of the store tangible. Pause and think about what is happening:

- `remote-app` creates `todoStore` when its module first loads
- Federation's `singleton: true` ensures `@todoflow/mini-store` loads once
- `host-app` imports `remoteApp/todoStore` — which points to remote's module
- Both apps hold a reference to the **same JavaScript object** in the browser's heap
- `store.set()` in remote notifies `store.subscribe()` callbacks in host — zero milliseconds of travel time

This is not React. This is not a framework. This is JavaScript object references.

### Acceptance Criteria
- [ ] Stats show 0 / 0 / 0 on load
- [ ] Adding a todo immediately increments "Total" and "Pending" in the host
- [ ] Completing a todo immediately moves the count from "Pending" to "Completed"
- [ ] Deleting a todo immediately decrements "Total"
- [ ] TypeScript: `import { todoStore } from 'remoteApp/todoStore'` has full type inference

---

## PR-08 — Cross-App Events via Event Bus

### Goal
Expose the EventBus singleton from `remote-app`. The `host-app` subscribes to it and renders a live activity feed. This demonstrates the second communication channel — fire-and-forget events rather than shared state.

### What Changes

**`apps/remote-app/next.config.ts`** — add EventBus to exposes:
```ts
exposes: {
  './TodoApp':   './components/TodoApp',
  './todoStore': './store/todoStore',
  './EventBus':  './lib/EventBus',
},
```

**`apps/remote-app/lib/EventBus.ts`** — thin re-export:
```ts
export { EventBus } from '@todoflow/event-bus';
export type { TodoEvent } from '@todoflow/event-bus';
```

**`apps/host-app/types/federation.d.ts`** — add EventBus types:
```ts
declare module 'remoteApp/EventBus' {
  export { EventBus } from '@todoflow/event-bus';
  export type { TodoEvent } from '@todoflow/event-bus';
}
```

**`apps/host-app/app/components/ActivityFeed.tsx`**:
```tsx
"use client";
import { useEffect, useState, useCallback } from 'react';
import { EventBus } from 'remoteApp/EventBus';
import type { TodoEvent } from 'remoteApp/EventBus';

type FeedItem = { id: string; message: string; time: string };

function describe(event: TodoEvent): string {
  switch (event.type) {
    case 'TODO_ADDED':        return `✅ Added "${event.payload.text}"`;
    case 'TODO_TOGGLED':      return event.payload.completed ? '☑️ Marked complete' : '↩️ Reopened';
    case 'TODO_DELETED':      return '🗑️ Deleted a todo';
    case 'FILTER_CHANGED':    return `🔍 Filter → ${event.payload.filter}`;
    case 'CLEARED_COMPLETED': return `🧹 Cleared ${event.payload.count} todos`;
  }
}

export function ActivityFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  // useCallback: stable reference so useEffect deps don't change every render
  const onEvent = useCallback((event: TodoEvent) => {
    setFeed(prev =>
      [{
        id: crypto.randomUUID(),
        message: describe(event),
        time: new Date().toLocaleTimeString(),
      }, ...prev].slice(0, 20)
    );
  }, []);

  useEffect(() => {
    const unsubscribe = EventBus.getInstance().subscribe(onEvent);
    return unsubscribe; // remove window event listener on unmount
  }, [onEvent]);

  if (feed.length === 0) {
    return <p className="text-sm text-slate-400">No activity yet. Add a todo!</p>;
  }

  return (
    <ul className="space-y-2">
      {feed.map(item => (
        <li key={item.id} className="flex justify-between rounded bg-white px-3 py-2 shadow-sm text-sm">
          <span>{item.message}</span>
          <span className="text-slate-400 ml-2 shrink-0">{item.time}</span>
        </li>
      ))}
    </ul>
  );
}
```

### What You Learn
- `useCallback` with an empty dependency array — creates a stable function reference so `useEffect` only runs once
- `useEffect` return value as cleanup — React calls the returned function when the component unmounts, preventing memory leaks and duplicate listeners
- Why `slice(0, 20)` — unbounded state arrays in long-running apps are a memory leak
- TypeScript exhaustive switch — add a new event type and every `switch` statement that doesn't handle it becomes a compile error

### Acceptance Criteria
- [ ] Every todo action (add, toggle, delete, filter, clear) produces an activity feed entry
- [ ] Feed is capped at 20 items
- [ ] Unmounting and remounting `ActivityFeed` does not multiply listeners
- [ ] Timestamps are accurate

---

## PR-09 — Error Boundaries & Resilience

### Goal
Make the host survive when the remote is unavailable. In real microfrontend systems, remotes deploy independently and can be down, slow, or broken at any moment. The host must handle this without crashing.

### What Changes

Install the error boundary library:
```bash
pnpm --filter host-app add react-error-boundary
```

**`apps/host-app/app/components/RemoteTodo.tsx`** — full resilience:
```tsx
"use client";
import dynamic from 'next/dynamic';
import { Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

const RemoteTodoApp = dynamic(
  () => import('remoteApp/TodoApp').catch(() => ({
    // If the module fails to load (remote down, network error, etc.)
    // return a no-crash fallback component instead of throwing
    default: function RemoteLoadFailed() {
      return <RemoteDownBanner />;
    },
  })),
  { ssr: false }
);

function RemoteDownBanner() {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
      <p className="font-semibold text-red-700">Todo Service Unavailable</p>
      <p className="mt-1 text-sm text-red-500">
        Start remote-app on port 3001 and refresh.
      </p>
    </div>
  );
}

function RuntimeError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
      <p className="font-semibold text-orange-700">Something went wrong</p>
      <p className="mt-1 text-xs text-orange-500 font-mono">{error.message}</p>
      <button
        onClick={retry}
        className="mt-4 rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700"
      >
        Try Again
      </button>
    </div>
  );
}

export function RemoteTodo() {
  const [key, setKey] = useState(0);

  return (
    <ErrorBoundary
      fallbackRender={({ error }) => (
        <RuntimeError error={error} retry={() => setKey(k => k + 1)} />
      )}
      resetKeys={[key]}
    >
      <Suspense fallback={<TodoSkeleton />}>
        <RemoteTodoApp key={key} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### The Two Failure Modes

**Failure at load time** (remote-app is down):
- `import('remoteApp/TodoApp')` rejects
- `.catch()` intercepts and returns a fallback component
- User sees "Remote Unavailable" — no crash, no white screen

**Failure at render time** (remote-app loaded but threw a JavaScript error):
- React catches the error at the `ErrorBoundary`
- User sees the error message and a "Try Again" button
- Incrementing `key` forces a full remount and retry attempt

### What You Learn
- `.catch()` on a dynamic import — transforms a module load failure into a fallback component
- `ErrorBoundary` from `react-error-boundary` — catches render-time errors in component subtrees
- `resetKeys` — when any value in this array changes, the boundary resets and re-renders its children
- The difference between load-time and render-time failures in federated components
- Why `key` increment forces a remount — React treats a changed `key` as "this is a new component instance"

### Acceptance Criteria
- [ ] Stop `remote-app`. Refresh host. See "Remote Unavailable" — no crash, no white screen
- [ ] Start `remote-app`. Click "Try Again". Todo app loads correctly.
- [ ] Add `throw new Error('test')` to `TodoApp.tsx`. See the error boundary fallback in host.
- [ ] Fix the error. Click "Try Again". App recovers.

---

## PR-10 — TypeScript Strictness, Polish & Docker

### Goal
The final PR locks in type safety across the whole monorepo, polishes the UI, and adds Dockerfiles to simulate real independent deployment. This is the "push to production" PR.

### TypeScript Strictness

Enable in `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

`noUncheckedIndexedAccess` is the most important new flag: `todos[0]` now has type `Todo | undefined` instead of `Todo`. This catches a real class of runtime crashes where you assume an array has elements.

### Complete `federation.d.ts`

```ts
// apps/host-app/types/federation.d.ts
import type { Store } from '@todoflow/mini-store';
import type { TodoState } from '@todoflow/mini-store';

declare module 'remoteApp/TodoApp' {
  const TodoApp: React.FC;
  export default TodoApp;
}

declare module 'remoteApp/todoStore' {
  export { todoStore, useStore } from '@todoflow/mini-store';
  export type { Todo, TodoState } from '@todoflow/mini-store';
}

declare module 'remoteApp/EventBus' {
  export { EventBus } from '@todoflow/event-bus';
  export type { TodoEvent } from '@todoflow/event-bus';
}
```

### Docker — Independent Deployment

**`apps/remote-app/Dockerfile`**:
```dockerfile
FROM node:20-alpine AS base
RUN npm i -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/remote-app/package.json ./apps/remote-app/
COPY packages/mini-store/package.json   ./packages/mini-store/
COPY packages/event-bus/package.json    ./packages/event-bus/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter remote-app build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY --from=builder /app/apps/remote-app/.next/standalone ./
COPY --from=builder /app/apps/remote-app/.next/static ./apps/remote-app/.next/static
EXPOSE 3001
CMD ["node", "apps/remote-app/server.js"]
```

**`docker-compose.yml`** (root):
```yaml
version: '3.8'
services:
  remote-app:
    build: { context: ., dockerfile: apps/remote-app/Dockerfile }
    ports: ["3001:3001"]
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3001"]
      interval: 10s
      retries: 3

  host-app:
    build: { context: ., dockerfile: apps/host-app/Dockerfile }
    ports: ["3000:3000"]
    environment: { REMOTE_URL: "http://remote-app:3001" }
    depends_on:
      remote-app: { condition: service_healthy }
```

### What You Learn
- `noUncheckedIndexedAccess` — the flag that makes array access type-safe by default
- Multi-stage Docker builds — each stage has a single responsibility; the final image contains only what's needed to run
- `REMOTE_URL` env var — the host is configured at runtime, not build time. Point it at any remote deployment.
- `depends_on` with health check — Docker waits for the remote to be serving before starting the host
- `next build` with `output: 'standalone'` — produces a self-contained `server.js` + static files, perfect for containers

### Acceptance Criteria
- [ ] `pnpm type-check` passes across all packages: zero errors
- [ ] `docker compose up --build` starts both apps successfully
- [ ] http://localhost:3000 works with full federation inside Docker
- [ ] Stopping `remote-app` container shows error boundary in host (not a crash)
- [ ] All interactive elements keyboard accessible
- [ ] Zero console errors in browser

---

## After All 10 PRs

You will have built every layer from scratch:

- ✅ The observable state primitive — what all state libraries are
- ✅ The pub/sub event pattern — what all event libraries are
- ✅ Module Federation — runtime code sharing across independent deployments
- ✅ `useSyncExternalStore` — React's own API for external state, used directly
- ✅ Next.js 15 App Router — Server Components, streaming, Suspense, Client boundaries
- ✅ TypeScript at scale — strict mode, discriminated unions, ambient declarations
- ✅ Resilient MFE architecture — error boundaries, graceful degradation, retry

### Where to Go Next

- Replace `window.dispatchEvent` with **BroadcastChannel** — communicate across browser tabs
- Add **WebSockets** — real-time events from a server, not just local browser events
- Deploy to **Vercel** (host) + **Fly.io** (remote) — real cross-domain federation
- Add a third MFE — a Calendar app that can tag todos with due dates
- Read Zustand's source code — you will now understand every line of it
