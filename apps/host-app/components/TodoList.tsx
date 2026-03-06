"use client"

// =============================================================================
// TodoList.tsx — Renders the Filtered List of Todos
// =============================================================================
//
// This component has two jobs:
//   1. Subscribe to the store and derive the VISIBLE todos from filter + todos
//   2. Render a TodoItem for each visible todo
//
// It also owns the "Clear Completed" button — the only bulk action.
//
// DERIVED STATE — DON'T STORE IT, COMPUTE IT:
// ---------------------------------------------
// The filtered list is not stored anywhere. We compute it fresh on every render.
//
//   ❌ Wrong: store a separate "visibleTodos" array in the store
//   ✅ Right: derive it from (todos + filter) at render time
//
// Storing derived state creates synchronisation problems — you have to remember
// to update visibleTodos every time todos OR filter changes.
// Computing it removes the problem entirely. It is always correct by definition.
//
// This is a fundamental React principle: state = minimum data, UI = derived.
// =============================================================================

import { useStore }               from '@todoflow/mini-store'
import { todoStore, todoActions }  from '@todoflow/mini-store'
import { EventBus }               from '@todoflow/event-bus'
import { TodoItem }               from './TodoItem'

export function TodoList() {
  // Subscribe to the full state — we need both todos and filter to derive the list.
  // Alternative: two separate useStore calls with separate selectors.
  // One call is fine here because this component needs both values anyway.
  const todos  = useStore(todoStore, s => s.todos)
  const filter = useStore(todoStore, s => s.filter)

  // ------------------------------------------------------------------
  // Derive the visible list from current todos + current filter.
  // Computed fresh on every render — no stale state possible.
  // ------------------------------------------------------------------
  const visibleTodos = todos.filter(todo => {
    if (filter === 'active')    return !todo.completed
    if (filter === 'completed') return  todo.completed
    return true // 'all' — show everything
  })

  // Count of completed todos — used for the "Clear Completed" button label
  // and to decide whether to show the button at all.
  const completedCount = todos.filter(t => t.completed).length

  function handleClearCompleted() {
    // todoActions.clearCompleted() returns how many were removed.
    // We need this count for the event payload so ActivityFeed can log:
    // "Cleared 3 completed todos"
    const count = todoActions.clearCompleted()

    EventBus.getInstance().emit({
      type:    'CLEARED_COMPLETED',
      payload: { count },
    })
  }

  // ------------------------------------------------------------------
  // Empty state — shown when there are no todos at all
  // ------------------------------------------------------------------
  if (todos.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400">
        <p className="text-sm">No todos yet.</p>
        <p className="mt-1 text-xs">Add one above to get started.</p>
      </div>
    )
  }

  // ------------------------------------------------------------------
  // Filter empty state — todos exist but none match the current filter
  // ------------------------------------------------------------------
  if (visibleTodos.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400">
        <p className="text-sm">
          No <span className="font-medium">{filter}</span> todos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* The list */}
      <ul className="space-y-2">
        {visibleTodos.map(todo => (
          // key must be stable and unique — UUID is perfect.
          // Never use array index as key — if items reorder or delete,
          // React gets confused about which item is which.
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </ul>

      {/* Footer — item count + clear completed */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">

        <span>
          {/* Pluralise correctly: "1 item" vs "2 items" */}
          {todos.filter(t => !t.completed).length}{' '}
          {todos.filter(t => !t.completed).length === 1 ? 'item' : 'items'} left
        </span>

        {/* Only show "Clear Completed" when there is something to clear */}
        {completedCount > 0 && (
          <button
            onClick={handleClearCompleted}
            className="transition-colors hover:text-red-400"
          >
            Clear completed ({completedCount})
          </button>
        )}

      </div>
    </div>
  )
}
