"use client"

// =============================================================================
// TodoItem.tsx — A Single Todo Row
// =============================================================================
//
// Responsibilities:
//   - Display one todo: checkbox, text, priority badge, delete button
//   - Handle toggle (checkbox click) → store + event
//   - Handle delete (button click)   → store + event
//
// This component is a LEAF — it has no children components.
// It is the most granular interactive unit in the UI.
//
// WHY IS THIS A SEPARATE COMPONENT AND NOT INLINE IN TodoList?
// -------------------------------------------------------------
// Separation of concerns — each component does one job.
// More importantly: React re-renders at the component boundary.
//
// If TodoItem were inline JSX in TodoList's render, toggling one todo
// would re-render the ENTIRE list because TodoList would re-render.
//
// As a separate component, React can compare the OLD TodoItem props
// with the NEW TodoItem props and skip re-rendering items that didn't change.
// (We could add React.memo() here later to make this even more explicit.)
// =============================================================================

import type { Todo }              from '@todoflow/mini-store'
import { todoActions }            from '@todoflow/mini-store'
import { EventBus }               from '@todoflow/event-bus'

// Colour mapping for priority badges.
// Defined outside the component so it's not recreated on every render.
// TypeScript: Record<Todo['priority'], string> means the key must be
// one of 'low' | 'medium' | 'high' — TypeScript errors if you miss one.
const PRIORITY_STYLES: Record<Todo['priority'], string> = {
  low:    'bg-slate-100 text-slate-500',
  medium: 'bg-yellow-100 text-yellow-700',
  high:   'bg-red-100 text-red-600',
}

interface TodoItemProps {
  todo: Todo
}

export function TodoItem({ todo }: TodoItemProps) {

  function handleToggle() {
    // Step 1 — flip the completed flag in the store
    todoActions.toggleTodo(todo.id)

    // Step 2 — emit event so ActivityFeed in host-app logs this
    // We read the NEW completed value by flipping the current one,
    // because the store has already updated by the time we emit.
    EventBus.getInstance().emit({
      type:    'TODO_TOGGLED',
      payload: {
        id:        todo.id,
        // !todo.completed because todoActions.toggleTodo already flipped it.
        // If we passed todo.completed we'd be emitting the OLD value.
        completed: !todo.completed,
      },
    })
  }

  function handleDelete() {
    // Step 1 — remove from store
    todoActions.deleteTodo(todo.id)

    // Step 2 — emit event
    EventBus.getInstance().emit({
      type:    'TODO_DELETED',
      payload: { id: todo.id },
    })
  }

  return (
    <li className={[
      'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
      // Completed todos get a muted background to visually distinguish them
      todo.completed
        ? 'border-slate-100 bg-slate-50'
        : 'border-slate-200 bg-white',
    ].join(' ')}>

      {/* Checkbox — clicking toggles completion */}
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={handleToggle}
        // aria-label for screen readers — they need to know what this checkbox does
        aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
        className="h-4 w-4 cursor-pointer accent-blue-600"
      />

      {/* Todo text — strikethrough when completed */}
      <span className={[
        'flex-1 text-sm',
        todo.completed
          ? 'text-slate-400 line-through'
          : 'text-slate-700',
      ].join(' ')}>
        {todo.text}
      </span>

      {/* Priority badge */}
      <span className={[
        'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        PRIORITY_STYLES[todo.priority],
      ].join(' ')}>
        {todo.priority}
      </span>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        aria-label={`Delete "${todo.text}"`}
        className="
          rounded p-1 text-slate-300
          transition-colors hover:bg-red-50 hover:text-red-400
        "
      >
        {/* Simple × character — no icon library needed */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

    </li>
  )
}
