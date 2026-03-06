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
export type TodoEvent = {
    type: "TODO_ADDED";
    payload: {
        id: string;
        text: string;
        priority: string;
    };
} | {
    type: "TODO_TOGGLED";
    payload: {
        id: string;
        completed: boolean;
    };
} | {
    type: "TODO_DELETED";
    payload: {
        id: string;
    };
} | {
    type: "FILTER_CHANGED";
    payload: {
        filter: string;
    };
} | {
    type: "CLEARED_COMPLETED";
    payload: {
        count: number;
    };
};
