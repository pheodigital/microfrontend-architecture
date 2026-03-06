import type { Store } from "./createStore";
/**
 * useStore — subscribe to any Store and select a slice of its state.
 *
 * @param store    - The store to subscribe to (created with createStore)
 * @param selector - A function that picks the part of state you care about.
 *                   The component ONLY re-renders when the selector's result changes.
 *                   This is a critical performance optimisation.
 *
 * @returns The selected slice of state, always up-to-date.
 *
 * HOW THE SELECTOR PREVENTS UNNECESSARY RE-RENDERS:
 * ----------------------------------------------------
 * Imagine TodoState has { todos: [], filter: 'all' }.
 *
 * Without a selector, every state change re-renders every subscriber —
 * even if the component only cares about the filter.
 *
 * With a selector:
 *   useStore(todoStore, s => s.filter)
 *
 * React compares the OLD selector result with the NEW selector result.
 * If they are the same value (===), React skips the re-render entirely.
 * The component only re-renders when ITS slice of state actually changed.
 *
 * This is the same pattern Zustand's useStore uses:
 *   const filter = useTodoStore(s => s.filter)  ← Zustand
 *   const filter = useStore(todoStore, s => s.filter)  ← ours
 *
 * @example
 *   // Re-renders only when the todos array changes
 *   const todos = useStore(todoStore, s => s.todos)
 *
 *   // Re-renders only when the filter changes
 *   const filter = useStore(todoStore, s => s.filter)
 *
 *   // Derived value — re-renders only when the count changes
 *   const completedCount = useStore(todoStore, s => s.todos.filter(t => t.completed).length)
 */
export declare function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S;
