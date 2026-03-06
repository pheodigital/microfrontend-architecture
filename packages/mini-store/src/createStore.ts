// =============================================================================
// createStore.ts — The Observable Primitive
// =============================================================================
//
// This is the entire theory of state management in one file.
// Zustand, Redux, Jotai, MobX — they all reduce to this pattern:
//
//   1. A variable that holds the current state
//   2. A collection of functions that want to know when state changes
//   3. A function that updates the variable AND calls all those functions
//
// That's it. Everything else those libraries offer is API sugar on top.
// Read this file once and you will never be confused by a state library again.
// =============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A Listener is any function that receives the new state whenever it changes.
 * When you call store.subscribe(fn), fn becomes a Listener.
 *
 * Generic <T> means: "whatever shape the state is, the listener receives that shape."
 * If state is TodoState, the listener gets TodoState. TypeScript enforces this.
 */
type Listener<T> = (state: T) => void;

/**
 * A Setter is what you pass to store.set().
 * It can be one of two things:
 *
 *   1. A direct value:        store.set({ todos: [], filter: 'all' })
 *   2. An updater function:   store.set(prev => ({ ...prev, filter: 'active' }))
 *
 * WHY support updater functions?
 * --------------------------------
 * If you only support direct values, you hit a classic closure bug:
 *
 *   // Inside a React component:
 *   const handleClick = () => {
 *     store.set({ ...store.get(), count: store.get().count + 1 })
 *   }
 *
 * If handleClick is called twice in the same render cycle (e.g. by React's
 * concurrent mode batching), both calls read the SAME old count.
 * Result: count increments by 1 instead of 2.
 *
 * With an updater function:
 *   store.set(prev => ({ ...prev, count: prev.count + 1 }))
 *
 * Each call receives the ACTUAL latest state — no stale reads.
 * This is identical to why React's own setState supports updater functions.
 */
type Setter<T> = T | ((prev: T) => T);

// ---------------------------------------------------------------------------
// Store interface — the public contract
// ---------------------------------------------------------------------------

/**
 * The Store interface defines the three operations every store must support.
 * This is what consumers (components, actions) interact with.
 *
 * Keeping this as an interface (not a class) means:
 *   - The store is a plain object, easy to serialise and inspect
 *   - No "this" binding issues
 *   - Easy to mock in tests
 */
export interface Store<T> {
  /**
   * Read the current state synchronously.
   * This is always up-to-date — no async, no stale reads.
   *
   * Usage:  const state = store.get()
   *         const todos = store.get().todos
   */
  get: () => T;

  /**
   * Update the state and notify every subscriber.
   * Accepts either a direct value or an updater function (see Setter above).
   *
   * Usage:  store.set({ todos: [], filter: 'all' })
   *         store.set(prev => ({ ...prev, filter: 'active' }))
   */
  set: (next: Setter<T>) => void;

  /**
   * Register a function to be called every time state changes.
   * Returns a cleanup function — call it to stop listening.
   *
   * WHY return a cleanup function?
   * --------------------------------
   * This is the standard browser cleanup pattern. EventTarget does it:
   *   window.addEventListener('click', fn)   ← subscribe
   *   window.removeEventListener('click', fn) ← cleanup
   *
   * Returning a function makes cleanup ergonomic in React:
   *   useEffect(() => {
   *     const unsubscribe = store.subscribe(handler)
   *     return unsubscribe  // React calls this on unmount automatically
   *   }, [])
   *
   * Usage:  const unsubscribe = store.subscribe(state => console.log(state))
   *         unsubscribe() // stop listening
   */
  subscribe: (listener: Listener<T>) => () => void;
}

// ---------------------------------------------------------------------------
// createStore — the factory function
// ---------------------------------------------------------------------------

/**
 * Creates a new store with the given initial state.
 *
 * This is a factory function, not a class.
 * It returns a plain object with three methods: get, set, subscribe.
 *
 * @param initialState - The starting value for this store's state
 * @returns A Store object with get / set / subscribe
 *
 * @example
 *   const counterStore = createStore({ count: 0 })
 *   counterStore.subscribe(state => console.log(state.count))
 *   counterStore.set(prev => ({ count: prev.count + 1 }))
 *   // logs: 1
 */
export function createStore<T>(initialState: T): Store<T> {
  // -------------------------------------------------------------------------
  // Private state — only accessible through get() and set()
  // "let" because this variable gets reassigned every time set() is called.
  // -------------------------------------------------------------------------
  let state = initialState;

  // -------------------------------------------------------------------------
  // The listener collection — everyone who wants to know about state changes.
  //
  // WHY Set and not Array?
  // -------------------------------------------------------------------------
  // Set<Listener<T>> vs Array<Listener<T>>:
  //
  //   1. UNIQUENESS: Set automatically ignores duplicate subscriptions.
  //      If you accidentally call store.subscribe(fn) twice with the same fn,
  //      Array would call fn twice on every update. Set silently deduplicates.
  //
  //   2. DELETION SPEED: Set.delete() is O(1) — instant, regardless of size.
  //      Array.filter() is O(n) — gets slower as you add more subscribers.
  //      In a large app with hundreds of subscribers, this matters.
  //
  //   3. NO INDEX MANAGEMENT: With an Array you'd need to track indices
  //      to remove a specific listener. Set handles identity automatically.
  // -------------------------------------------------------------------------
  const listeners = new Set<Listener<T>>();

  return {
    // -----------------------------------------------------------------------
    // get() — synchronous state read
    // Simply returns the current state variable. That's all it needs to do.
    // -----------------------------------------------------------------------
    get() {
      return state;
    },

    // -----------------------------------------------------------------------
    // set() — state update + notification
    // -----------------------------------------------------------------------
    set(next) {
      // Determine the new state.
      // If next is a function (updater pattern), call it with current state.
      // If next is a value (direct pattern), use it as-is.
      //
      // The type cast "(next as (prev: T) => T)" is needed because TypeScript
      // cannot narrow a generic type with typeof alone. We know it's safe
      // because we checked typeof next === 'function' first.
      state =
        typeof next === "function" ? (next as (prev: T) => T)(state) : next;

      // Notify every subscriber with the new state.
      //
      // WHY forEach and not a for...of loop?
      // Set.forEach is slightly more idiomatic for Sets and avoids the
      // overhead of creating an iterator object. Both work correctly.
      //
      // NOTE: Listeners are called SYNCHRONOUSLY, one by one, in insertion order.
      // This means: by the time set() returns, ALL subscribers have been notified.
      // No async, no batching, no scheduling — just immediate, predictable updates.
      listeners.forEach((listener) => listener(state));
    },

    // -----------------------------------------------------------------------
    // subscribe() — register a listener, get back a cleanup function
    // -----------------------------------------------------------------------
    subscribe(listener) {
      listeners.add(listener);

      // Return the unsubscribe function.
      // Arrow function captures "listener" in its closure —
      // calling this will always remove the exact right listener.
      return () => listeners.delete(listener);
    },
  };
}
