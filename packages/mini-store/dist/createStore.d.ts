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
export declare function createStore<T>(initialState: T): Store<T>;
export {};
