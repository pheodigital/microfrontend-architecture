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

/**
 * TodoEvent — every event that can flow from remote-app to host-app.
 *
 * Each member is an object with two fields:
 *   type    → a string LITERAL (not just "string") — this is the discriminant
 *   payload → the data that accompanies this specific event
 *
 * String literals vs string:
 *   type: string        → could be "anything", TypeScript can't narrow on it
 *   type: 'TODO_ADDED'  → can ONLY ever be exactly 'TODO_ADDED', TypeScript narrows perfectly
 */
export type TodoEvent =
  // Fired when the user submits the TodoForm and a new todo is created.
  // Payload carries everything the ActivityFeed needs to describe the event.
  | {
      type: "TODO_ADDED";
      payload: {
        id: string; // the UUID assigned to the new todo
        text: string; // what the user typed
        priority: string; // 'low' | 'medium' | 'high'
      };
    }

  // Fired when a TodoItem's checkbox is clicked — toggled either direction.
  // "completed" tells the host whether it was marked done or reopened.
  | {
      type: "TODO_TOGGLED";
      payload: {
        id: string; // which todo changed
        completed: boolean; // true = just completed, false = just reopened
      };
    }

  // Fired when the delete button on a TodoItem is clicked.
  // We only need the id — the host doesn't need the full todo text
  // (the ActivityFeed just shows "Deleted a todo").
  | {
      type: "TODO_DELETED";
      payload: {
        id: string;
      };
    }

  // Fired when the user clicks All / Active / Completed filter buttons.
  // Lets the host's ActivityFeed log: "Filter → active"
  | {
      type: "FILTER_CHANGED";
      payload: {
        filter: string; // 'all' | 'active' | 'completed'
      };
    }

  // Fired when the user clicks "Clear Completed."
  // count tells the ActivityFeed how many todos were removed.
  | {
      type: "CLEARED_COMPLETED";
      payload: {
        count: number;
      };
    };
