// =============================================================================
// @todoflow/mini-store — Public API
// =============================================================================
//
// This barrel file (index.ts) is the ONLY file consumers import from.
// Internal files (createStore.ts, useStore.ts, todoStore.ts) are
// implementation details — they can change without breaking consumers.
//
// A barrel file re-exports everything the outside world needs.
// This pattern is called the "barrel export" or "index pattern."
// It gives you one stable import path regardless of internal structure:
//
//   import { useStore, todoStore, todoActions } from '@todoflow/mini-store'
//
// ...instead of:
//
//   import { useStore }    from '@todoflow/mini-store/src/useStore'
//   import { todoStore }   from '@todoflow/mini-store/src/todoStore'
//   import { todoActions } from '@todoflow/mini-store/src/todoStore'
//
// If you ever reorganise the internal files, consumers don't change.
// =============================================================================
// The observable primitive — consumers rarely need this directly,
// but it's exported so they can create their OWN stores if needed.
export { createStore } from "./createStore";
// The React hook — this is what components use to read store state.
// Import: import { useStore } from '@todoflow/mini-store'
export { useStore } from "./usestore";
// The actual todo store instance + all mutations.
// Import: import { todoStore, todoActions } from '@todoflow/mini-store'
// Import: import type { Todo, TodoState }   from '@todoflow/mini-store'
export { todoStore, todoActions } from "./todoStore";
//# sourceMappingURL=index.js.map