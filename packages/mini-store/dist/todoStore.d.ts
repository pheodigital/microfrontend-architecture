/**
 * A single todo item.
 * We use an ISO string for createdAt (not a Date object) because:
 *   - Strings are JSON-serialisable (easy to store, log, debug)
 *   - Date objects are mutable — strings are safely immutable
 *   - new Date().toISOString() gives us a sortable, readable timestamp
 */
export interface Todo {
    id: string;
    text: string;
    completed: boolean;
    priority: "low" | "medium" | "high";
    createdAt: string;
}
/**
 * The complete state of the todo store.
 * This is what store.get() returns and what listeners receive.
 *
 * Keeping filter in the store (not local component state) means:
 *   - Both apps can read the current filter
 *   - The remote can emit a FILTER_CHANGED event (PR-03 / PR-08)
 *   - The host's ActivityFeed can log filter changes in real time
 */
export interface TodoState {
    todos: Todo[];
    filter: "all" | "active" | "completed";
}
/**
 * todoStore — the single source of truth for all todo data.
 *
 * This is created ONCE when this module first loads.
 * In the browser, a module loads once and is cached.
 * This means todoStore is a true singleton — the same object
 * for the entire lifetime of the browser session.
 *
 * IMPORTANT — the Module Federation singleton:
 * When remote-app exposes this module via federation (PR-06),
 * and host-app imports it, both apps get a REFERENCE to this
 * exact same JavaScript object. Not a copy — the same object.
 *
 * That is how cross-app state sharing works without any framework:
 *   remote writes → store notifies → host re-renders
 * All in the same browser memory. Zero network round-trips.
 */
export declare const todoStore: import("./createStore").Store<TodoState>;
/**
 * todoActions — every way you can mutate todo state.
 *
 * These are grouped in an object for organisation, but they are
 * just functions. You could write them as standalone exports and
 * nothing would break. The object is a namespace, not a class.
 *
 * Each action follows the same three-step pattern:
 *   1. Call store.set() with an updater function
 *   2. The updater receives the current state as "prev"
 *   3. Return a new state object (spread prev, change what needs changing)
 *
 * We always return a NEW object — never mutate prev directly.
 * WHY? Because if we mutate prev, the old reference === the new reference,
 * and anything comparing by reference (like useSyncExternalStore) would
 * think nothing changed and skip re-renders. Always return new objects.
 */
export declare const todoActions: {
    /**
     * Add a new todo to the list.
     *
     * crypto.randomUUID() — built into every modern browser and Node.js 15+.
     * No library needed. Generates a UUID v4 like: "550e8400-e29b-41d4-a716-446655440000"
     * Collision probability is astronomically low — treat it as unique.
     *
     * @param text     - The todo text the user typed
     * @param priority - Defaults to 'medium' if not provided
     */
    addTodo(text: string, priority?: Todo["priority"]): void;
    /**
     * Toggle a todo between completed and not completed.
     *
     * .map() returns a NEW array — never mutates the original.
     * For every todo: if the id matches, flip completed. Otherwise, return unchanged.
     *
     * @param id - The UUID of the todo to toggle
     */
    toggleTodo(id: string): void;
    /**
     * Delete a todo by id.
     *
     * .filter() returns a NEW array containing only todos where the predicate is true.
     * "Keep everything EXCEPT the todo with this id."
     *
     * @param id - The UUID of the todo to remove
     */
    deleteTodo(id: string): void;
    /**
     * Change the active filter.
     *
     * The filter determines which todos are SHOWN in the list —
     * it does NOT delete todos. 'active' hides completed, 'completed' hides active.
     * Filtering is done at render time in TodoList.tsx (PR-04).
     *
     * @param filter - 'all' | 'active' | 'completed'
     */
    setFilter(filter: TodoState["filter"]): void;
    /**
     * Remove all completed todos at once.
     *
     * Returns the count of removed todos so the caller can pass it
     * to the EventBus (PR-03/PR-04):
     *   EventBus.emit({ type: 'CLEARED_COMPLETED', payload: { count } })
     *
     * @returns number of todos that were removed
     */
    clearCompleted(): number;
    /**
     * Update the text of an existing todo.
     * Useful if you want to add an "edit" feature to TodoItem.tsx later.
     *
     * @param id      - UUID of the todo to edit
     * @param newText - The replacement text
     */
    editTodo(id: string, newText: string): void;
    /**
     * Update the priority of an existing todo.
     *
     * @param id       - UUID of the todo to update
     * @param priority - 'low' | 'medium' | 'high'
     */
    setPriority(id: string, priority: Todo["priority"]): void;
};
