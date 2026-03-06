// =============================================================================
// todoStore.ts — The Todo Store Instance + Actions
// =============================================================================
//
// This file does two things:
//
//   1. Creates the store instance that holds all todo state
//   2. Defines the actions — plain functions that call store.set()
//
// NOTICE WHAT IS MISSING:
// -------------------------
//   ❌ No dispatch()          (Redux needs this — we don't)
//   ❌ No action creators     (Redux pattern — unnecessary here)
//   ❌ No reducers            (Redux pattern — unnecessary here)
//   ❌ No Immer / immutability library (we spread manually — it's clear)
//   ❌ No Provider component  (Context API pattern — we don't need it)
//   ❌ No class               (OOP pattern — plain objects are simpler)
//
// Actions are just functions. They read the store with store.get(),
// compute the next state, and write it with store.set().
// That is all state management has ever been.
// =============================================================================
import { createStore } from "./createStore";
// ---------------------------------------------------------------------------
// The store instance
// ---------------------------------------------------------------------------
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
export const todoStore = createStore({
    todos: [],
    filter: "all",
});
// ---------------------------------------------------------------------------
// Actions — plain functions that write to the store
// ---------------------------------------------------------------------------
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
export const todoActions = {
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
    addTodo(text, priority = "medium") {
        todoStore.set((prev) => ({
            // Spread the previous state — keep filter unchanged
            ...prev,
            // Add the new todo to the END of the array (newest at bottom).
            // We create a new array [...prev.todos, newTodo] — never push() into prev.todos
            // because that would MUTATE the existing array, breaking referential equality checks.
            todos: [
                ...prev.todos,
                {
                    id: crypto.randomUUID(),
                    text: text.trim(), // remove accidental leading/trailing spaces
                    completed: false,
                    priority,
                    createdAt: new Date().toISOString(),
                },
            ],
        }));
    },
    /**
     * Toggle a todo between completed and not completed.
     *
     * .map() returns a NEW array — never mutates the original.
     * For every todo: if the id matches, flip completed. Otherwise, return unchanged.
     *
     * @param id - The UUID of the todo to toggle
     */
    toggleTodo(id) {
        todoStore.set((prev) => ({
            ...prev,
            todos: prev.todos.map((todo) => 
            // Ternary: if this is the todo we want, flip completed. Otherwise, leave it alone.
            todo.id === id
                ? { ...todo, completed: !todo.completed } // new object, flipped flag
                : todo),
        }));
    },
    /**
     * Delete a todo by id.
     *
     * .filter() returns a NEW array containing only todos where the predicate is true.
     * "Keep everything EXCEPT the todo with this id."
     *
     * @param id - The UUID of the todo to remove
     */
    deleteTodo(id) {
        todoStore.set((prev) => ({
            ...prev,
            todos: prev.todos.filter((todo) => todo.id !== id),
        }));
    },
    /**
     * Change the active filter.
     *
     * The filter determines which todos are SHOWN in the list —
     * it does NOT delete todos. 'active' hides completed, 'completed' hides active.
     * Filtering is done at render time in TodoList.tsx (PR-04).
     *
     * @param filter - 'all' | 'active' | 'completed'
     */
    setFilter(filter) {
        // We emit a FILTER_CHANGED event from TodoList.tsx (PR-04) after calling this,
        // so the host's ActivityFeed can log the change.
        todoStore.set((prev) => ({ ...prev, filter }));
    },
    /**
     * Remove all completed todos at once.
     *
     * Returns the count of removed todos so the caller can pass it
     * to the EventBus (PR-03/PR-04):
     *   EventBus.emit({ type: 'CLEARED_COMPLETED', payload: { count } })
     *
     * @returns number of todos that were removed
     */
    clearCompleted() {
        // Read BEFORE the set() call — after set(), completed todos are gone
        const removedCount = todoStore
            .get()
            .todos.filter((t) => t.completed).length;
        todoStore.set((prev) => ({
            ...prev,
            todos: prev.todos.filter((todo) => !todo.completed),
        }));
        // Return count so the component calling this can emit the right event
        return removedCount;
    },
    /**
     * Update the text of an existing todo.
     * Useful if you want to add an "edit" feature to TodoItem.tsx later.
     *
     * @param id      - UUID of the todo to edit
     * @param newText - The replacement text
     */
    editTodo(id, newText) {
        todoStore.set((prev) => ({
            ...prev,
            todos: prev.todos.map((todo) => todo.id === id ? { ...todo, text: newText.trim() } : todo),
        }));
    },
    /**
     * Update the priority of an existing todo.
     *
     * @param id       - UUID of the todo to update
     * @param priority - 'low' | 'medium' | 'high'
     */
    setPriority(id, priority) {
        todoStore.set((prev) => ({
            ...prev,
            todos: prev.todos.map((todo) => todo.id === id ? { ...todo, priority } : todo),
        }));
    },
};
//# sourceMappingURL=todoStore.js.map