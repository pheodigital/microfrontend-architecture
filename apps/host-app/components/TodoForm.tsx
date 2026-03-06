"use client"

// =============================================================================
// TodoForm.tsx — Add New Todos
// =============================================================================
//
// This component owns the "add todo" interaction.
// It is the ONLY place in the app that calls todoActions.addTodo().
//
// PATTERN: Store write first, then event emit.
// Every action in this app follows the same two-step sequence:
//
//   1. Write to the store  → instant state update, re-renders subscribers
//   2. Emit an event       → notifies host-app's ActivityFeed
//
// Always in this order. The store is the source of truth.
// The event is a notification that something happened to the store.
// Never emit an event without updating the store first.
//
// WHY useRef INSTEAD OF useState FOR THE INPUT?
// -----------------------------------------------
// Two approaches:
//
//   Controlled (useState):
//     const [text, setText] = useState('')
//     <input value={text} onChange={e => setText(e.target.value)} />
//
//   Uncontrolled (useRef):
//     const inputRef = useRef<HTMLInputElement>(null)
//     <input ref={inputRef} />
//
// Controlled: React re-renders on EVERY keystroke. For a simple text input
// this is fine, but it means React is doing work 26 times as you type a word.
//
// Uncontrolled with ref: The DOM manages the input value natively.
// React is not involved until submit. We read the value ONCE on submit
// with inputRef.current.value — zero re-renders while typing.
//
// For a form this simple, useRef is the leaner choice.
// =============================================================================

import { useRef }                  from 'react'
import { todoStore, todoActions }  from '@todoflow/mini-store'
import { EventBus }                from '@todoflow/event-bus'

export function TodoForm() {
  // useRef gives us a stable reference to the DOM input element.
  // The generic <HTMLInputElement> tells TypeScript what kind of element
  // this ref will be attached to — gives us proper autocomplete on .value, .focus() etc.
  // null is the initial value before the element mounts.
  const inputRef = useRef<HTMLInputElement>(null)

  // Priority selector state — this DOES use a controlled pattern because
  // we want the selected value reflected visually in the UI immediately.
  // A ref would work too but useState is clearer for a <select>.
  const priorityRef = useRef<HTMLSelectElement>(null)

  function handleSubmit(e: React.FormEvent) {
    // Prevent the browser's default form behaviour — which is to reload the page.
    // Without this, submitting the form navigates away and loses all state.
    e.preventDefault()

    const text     = inputRef.current?.value.trim()
    const priority = (priorityRef.current?.value ?? 'medium') as 'low' | 'medium' | 'high'

    // Guard: do nothing if the input is empty or only whitespace
    if (!text) return

    // ------------------------------------------------------------------
    // Step 1 — Update the store
    // ------------------------------------------------------------------
    // todoActions.addTodo() calls store.set() internally.
    // Every subscriber (TodoList, and later StatsPanel in host-app) will
    // re-render synchronously before this line finishes.
    todoActions.addTodo(text, priority)

    // ------------------------------------------------------------------
    // Step 2 — Read back the todo we just created
    // ------------------------------------------------------------------
    // todoStore.get() returns the current state AFTER the set().
    // .at(-1) returns the last element of the array — the one we just added.
    // The "!" is a TypeScript non-null assertion — we KNOW at(-1) exists
    // because we just added an item, so the array cannot be empty.
    const newTodo = todoStore.get().todos.at(-1)!

    // ------------------------------------------------------------------
    // Step 3 — Emit the event
    // ------------------------------------------------------------------
    // The EventBus carries this to any subscriber in the browser —
    // including host-app's ActivityFeed which will log "Added: <text>"
    EventBus.getInstance().emit({
      type:    'TODO_ADDED',
      payload: {
        id:       newTodo.id,
        text:     newTodo.text,
        priority: newTodo.priority,
      },
    })

    // ------------------------------------------------------------------
    // Step 4 — Reset the form
    // ------------------------------------------------------------------
    if (inputRef.current)   inputRef.current.value   = ''
    if (priorityRef.current) priorityRef.current.value = 'medium'

    // Return focus to the input so the user can immediately type the next todo
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">

      {/* Text input — uncontrolled, managed by ref */}
      <input
        ref={inputRef}
        type="text"
        placeholder="What needs doing?"
        className="
          flex-1 rounded-lg border border-slate-200 px-3 py-2
          text-sm text-slate-800 placeholder-slate-400
          outline-none transition-colors
          focus:border-blue-400 focus:ring-2 focus:ring-blue-100
        "
      />

      {/* Priority selector */}
      <select
        ref={priorityRef}
        defaultValue="medium"
        className="
          rounded-lg border border-slate-200 px-2 py-2
          text-sm text-slate-600 outline-none
          focus:border-blue-400 focus:ring-2 focus:ring-blue-100
        "
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      {/* Submit button */}
      <button
        type="submit"
        className="
          rounded-lg bg-blue-600 px-4 py-2
          text-sm font-medium text-white
          transition-colors hover:bg-blue-700
          active:bg-blue-800
        "
      >
        Add
      </button>

    </form>
  )
}
