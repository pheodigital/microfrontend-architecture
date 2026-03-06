// =============================================================================
// events.ts — Every Event This System Can Fire
// =============================================================================
//
// This file defines the SHAPE of every event that remote-app can emit
// and host-app can receive. Nothing else. No logic. Just types.
//
// WHY PUT EVENTS IN A SEPARATE FILE?
// ------------------------------------
// Events are a CONTRACT between two apps.
// remote-app promises: "I will only ever emit these shapes."
// host-app promises:   "I will handle all of these shapes."
//
// Keeping them in one place means:
//   - One place to look when adding a new event
//   - One place to update when changing an event's payload
//   - Both apps import from this same file — the contract is enforced by TypeScript
//
// =============================================================================
//
// WHAT IS A DISCRIMINATED UNION?
// --------------------------------
// TodoEvent is a TypeScript "discriminated union" — a union of object types
// where each member has a common literal field ("type") that makes it unique.
//
// The "type" field is the DISCRIMINANT — it discriminates between members.
//
// Plain union:         string | number           (no discriminant)
// Discriminated union: A | B | C where each has a unique "type" literal
//
// Example WITHOUT discriminated union:
//
//   type Event = { payload: any }
//   function handle(e: Event) {
//     e.payload.text  // TypeScript: could be anything. No help.
//   }
//
// Example WITH discriminated union:
//
//   type Event =
//     | { type: 'ADDED';   payload: { text: string } }
//     | { type: 'DELETED'; payload: { id: string } }
//
//   function handle(e: Event) {
//     switch (e.type) {
//       case 'ADDED':
//         e.payload.text  // ✅ TypeScript KNOWS this is a string
//         e.payload.id    // ❌ TypeScript ERROR — no id on ADDED
//         break
//       case 'DELETED':
//         e.payload.id    // ✅ TypeScript KNOWS this is a string
//         break
//     }
//   }
//
// The SUPERPOWER: exhaustive checking.
// If you add a new event type to this union and forget to handle it
// in a switch statement, TypeScript will ERROR at compile time.
// You cannot forget a case. The compiler forces you to handle everything.
// =============================================================================
export {};
//# sourceMappingURL=events.js.map