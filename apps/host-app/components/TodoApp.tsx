"use client"

// =============================================================================
// TodoApp.tsx — The Root Component of the Todo MFE
// =============================================================================
//
// WHY "use client" AT THE TOP?
// ------------------------------
// Next.js 15 treats every component as a Server Component by default.
// Server Components run on the server only. They CANNOT use:
//   ❌ React hooks (useState, useEffect, useRef, useSyncExternalStore...)
//   ❌ Event handlers (onClick, onChange...)
//   ❌ Browser APIs (window, document, localStorage...)
//
// This component uses useStore() — which calls useSyncExternalStore() internally.
// That is a hook. Hooks are browser-only. So this MUST be a Client Component.
//
// "use client" is a BOUNDARY MARKER, not a file-level setting.
// It tells Next.js: "from this file downward, everything runs in the browser."
//
// The boundary propagates DOWNWARD through imports:
//   TodoApp ("use client")
//     → TodoForm     (automatically Client too — imported by a Client Component)
//     → TodoList     (automatically Client too)
//       → TodoItem   (automatically Client too)
//
// We still add "use client" explicitly to each child file for clarity.
// It does not hurt to be explicit.
//
// WHY THIS COMPONENT BECOMES THE FEDERATION ENTRY POINT (PR-06):
// ----------------------------------------------------------------
// In PR-06 we will expose THIS file via Module Federation:
//   exposes: { './TodoApp': './components/TodoApp' }
//
// host-app will then load it at runtime from port 3001:
//   const RemoteTodoApp = dynamic(() => import('remoteApp/TodoApp'), { ssr: false })
//
// Federated modules load in the browser — they cannot be Server Components.
// The "use client" here ensures that constraint is already satisfied before
// federation is even wired up.
// =============================================================================

import { useStore }               from '@todoflow/mini-store'
import { todoStore, todoActions }  from '@todoflow/mini-store'
import { EventBus }               from '@todoflow/event-bus'
import { TodoForm }               from './TodoForm'
import { TodoList }               from './TodoList'

// "as const" — tells TypeScript these are the exact literal types 'all' | 'active' | 'completed'
// Without it: string[] — TypeScript loses the specific types and
// todoActions.setFilter(f) would fail type-checking.
const FILTERS = ['all', 'active', 'completed'] as const

export default function TodoApp() {
  // Subscribe to only the filter slice of state.
  // This component re-renders ONLY when filter changes —
  // not when todos are added/toggled/deleted (TodoList handles those).
  const filter = useStore(todoStore, s => s.filter)

  function handleFilterChange(next: typeof FILTERS[number]) {
    // Step 1 — update the store (StatsPanel in host-app will react to this via PR-07)
    todoActions.setFilter(next)

    // Step 2 — emit an event so ActivityFeed in host-app logs the change (PR-08)
    // We emit AFTER the store update so the store is already in sync
    // if any subscriber reads it inside their handler.
    EventBus.getInstance().emit({
      type:    'FILTER_CHANGED',
      payload: { filter: next },
    })
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">

      {/* Header */}
      <h2 className="mb-5 text-xl font-bold text-slate-800">
        My Todos
      </h2>

      {/* Input form — add new todos */}
      <TodoForm />

      {/* Filter tabs — All / Active / Completed */}
      <nav className="my-4 flex gap-1">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={[
              'rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors',
              // Active filter gets a filled style, inactive gets a ghost style
              filter === f
                ? 'bg-blue-600 text-white'
                : 'text-slate-500 hover:bg-slate-100',
            ].join(' ')}
          >
            {f}
          </button>
        ))}
      </nav>

      {/* The list of todos — filtered inside TodoList */}
      <TodoList />

    </div>
  )
}
