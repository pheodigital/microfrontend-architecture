// =============================================================================
// @todoflow/event-bus — Public API
// =============================================================================
//
// Two exports. That's the entire public surface of this package.
//
// EventBus  → the singleton class. Use EventBus.getInstance() to get it.
//             .emit(event)      → fire an event
//             .subscribe(fn)    → listen for events, get back a cleanup fn
//
// TodoEvent → the TypeScript type for every possible event.
//             Import this wherever you write a switch(event.type) handler
//             to get exhaustive type checking.
//
// Usage in remote-app (emitting):
//   import { EventBus } from '@todoflow/event-bus'
//   EventBus.getInstance().emit({ type: 'TODO_ADDED', payload: { ... } })
//
// Usage in host-app (listening):
//   import { EventBus, type TodoEvent } from '@todoflow/event-bus'
//   const unsub = EventBus.getInstance().subscribe((event: TodoEvent) => { ... })
// =============================================================================
export { EventBus } from "./eventbus";
//# sourceMappingURL=index.js.map