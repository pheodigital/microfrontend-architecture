// =============================================================================
// useStore.ts — Connecting Our Store to React
// =============================================================================
//
// Our store (createStore.ts) is plain JavaScript — it knows nothing about React.
// That's intentional. But React components need to re-render when state changes.
//
// This file is the bridge between the two worlds.
//
// THE WRONG WAY (useState + useEffect):
// ----------------------------------------
//   function useStore(store) {
//     const [state, setState] = useState(store.get())
//     useEffect(() => {
//       return store.subscribe(setState)
//     }, [])
//     return state
//   }
//
// This looks right but has a critical bug in React 18+ concurrent mode:
//
//   1. React renders the component, reads state via useState
//   2. React "pauses" the render (concurrent mode can do this)
//   3. The external store updates (someone called store.set())
//   4. React resumes and commits — but the component still has the OLD state
//   5. React re-renders to fix it — a visible flicker or "tearing"
//
// "Tearing" means different parts of your UI show different versions of state
// simultaneously. A stats panel shows "5 todos" while the list shows 3.
//
// THE RIGHT WAY (useSyncExternalStore):
// ----------------------------------------
// React 18 ships useSyncExternalStore specifically for this problem.
// It was designed to safely bridge external (non-React) state into React's
// rendering model, with built-in protection against tearing.
//
// This is exactly what Zustand uses internally. We're calling it directly.
// =============================================================================
import { useSyncExternalStore } from "react";
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
export function useStore(store, selector) {
    return useSyncExternalStore(
    // -------------------------------------------------------------------------
    // Argument 1: subscribe
    // -------------------------------------------------------------------------
    // React calls this with its own internal callback when the component mounts.
    // We hand it directly to store.subscribe — our store already speaks this protocol.
    //
    // The subscribe function must:
    //   - Call the callback whenever state changes
    //   - Return a cleanup function that stops calling the callback
    //
    // Our store.subscribe does exactly this. Perfect fit. No adapter needed.
    store.subscribe, 
    // -------------------------------------------------------------------------
    // Argument 2: getSnapshot (browser)
    // -------------------------------------------------------------------------
    // React calls this to read the "current value" of the store.
    // It is called:
    //   - On initial render to get the starting value
    //   - After every store update to check if the component should re-render
    //   - React compares OLD snapshot === NEW snapshot — skips render if equal
    //
    // We wrap store.get() in the selector so React only sees the slice
    // this component cares about, not the entire state object.
    () => selector(store.get()), 
    // -------------------------------------------------------------------------
    // Argument 3: getServerSnapshot (server / SSR)
    // -------------------------------------------------------------------------
    // React calls this INSTEAD of getSnapshot when rendering on the server
    // (Next.js SSR). The server has no browser, no event loop, no subscribers —
    // it just needs a stable value to render to HTML.
    //
    // For our store, the server and browser snapshots are identical —
    // both just read the current state. In a more complex system you might
    // serve different initial state from the server (e.g. pre-fetched data).
    () => selector(store.get()));
}
//# sourceMappingURL=usestore.js.map