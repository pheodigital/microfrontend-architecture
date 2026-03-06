// =============================================================================
// EventBus.ts — The Pub/Sub System
// =============================================================================
//
// This class wraps two browser built-ins:
//   window.dispatchEvent(new CustomEvent(...))  ← emit
//   window.addEventListener(...)                ← subscribe
//   window.removeEventListener(...)             ← unsubscribe
//
// That is ALL this class does. There is no magic.
// Every pub/sub library (mitt, tiny-emitter, EventEmitter) is a polished
// version of this exact pattern. We use the raw API so you see what they wrap.
//
// WHY CustomEvent AND NOT A PLAIN Event?
// ----------------------------------------
// The browser's base Event class has no way to carry data.
// CustomEvent adds a "detail" field — an arbitrary payload you define.
//
//   new Event('click')                          → no data
//   new CustomEvent('click', { detail: {...} }) → carries your data
//
// WHY window.dispatchEvent AND NOT A LOCAL EVENT EMITTER?
// ---------------------------------------------------------
// We could build a Map<string, Function[]> in memory and call it done.
// But using window means:
//   - Any code in the browser tab can listen — including federated modules
//     loaded from a completely different server (port 3001 code in port 3000 app)
//   - Events are visible in browser DevTools under "Event Listeners"
//   - No shared object reference needed — just agree on the channel name
//
// The channel name 'todoflow:event' is namespaced with a colon.
// This is a convention to avoid clashing with browser built-in event names
// like 'click', 'load', 'resize'. Make it specific to your app.
//
// =============================================================================
//
// THE SINGLETON PATTERN
// ----------------------
// A singleton is a class that only ever has ONE instance.
// We enforce this with a private static property + a static factory method:
//
//   new EventBus()          ← ❌ forbidden (constructor is private)
//   EventBus.getInstance()  ← ✅ always returns the same instance
//
// WHY does EventBus need to be a singleton?
// When remote-app exposes EventBus via Module Federation (PR-06),
// and host-app imports it, BOTH get the same JavaScript class.
// getInstance() ensures both apps call methods on the SAME object.
//
// If EventBus were not a singleton, remote-app might emit on instance A
// and host-app might subscribe on instance B — they'd never connect.
// =============================================================================
// The DOM event channel name — both emit() and subscribe() must use
// the exact same string, or they'll never find each other.
// Namespaced with 'todoflow:' to avoid clashing with native DOM events.
const CHANNEL = "todoflow:event";
export class EventBus {
    // -------------------------------------------------------------------------
    // Static instance — the one and only EventBus object.
    //
    // "private static" means:
    //   private → only accessible inside this class
    //   static  → belongs to the CLASS itself, not any specific instance
    //             (there is only one copy of this variable, shared across all instances)
    //
    // We declare it without initialising it (no = new EventBus()) because
    // we create it lazily in getInstance() — only when first needed.
    // -------------------------------------------------------------------------
    static instance;
    // -------------------------------------------------------------------------
    // Private constructor — prevents "new EventBus()" from outside this class.
    // If someone tries: const bus = new EventBus()
    // TypeScript will error: "Constructor of class 'EventBus' is private."
    //
    // This is the enforcement mechanism of the singleton pattern.
    // The only way to get an EventBus is through getInstance().
    // -------------------------------------------------------------------------
    constructor() { }
    // -------------------------------------------------------------------------
    // getInstance() — the singleton factory.
    //
    // First call:  instance is undefined → create it → store it → return it
    // Every call after:  instance already exists → return the same one
    //
    // This is called "lazy initialisation" — we don't create the instance
    // until someone actually needs it. Avoids work at module load time.
    // -------------------------------------------------------------------------
    static getInstance() {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }
    // -------------------------------------------------------------------------
    // emit() — fire an event into the browser
    // -------------------------------------------------------------------------
    /**
     * Emit a typed event. Any code in the browser tab that has called
     * subscribe() will receive it synchronously.
     *
     * WHY the "typeof window === 'undefined'" guard?
     * ------------------------------------------------
     * Next.js renders components on the SERVER during SSR.
     * On the server there is no browser, no window, no DOM.
     * Calling window.dispatchEvent on the server throws:
     *   ReferenceError: window is not defined
     *
     * The guard makes emit() a safe no-op on the server.
     * Events only flow in the browser — that's fine, that's where the
     * subscribers (React components) live anyway.
     *
     * @param event - A typed TodoEvent — TypeScript enforces the shape
     */
    emit(event) {
        if (typeof window === "undefined")
            return;
        // CustomEvent carries our typed payload in the "detail" field.
        // Any subscriber who calls e.detail will get back a TodoEvent.
        window.dispatchEvent(new CustomEvent(CHANNEL, { detail: event }));
    }
    // -------------------------------------------------------------------------
    // subscribe() — listen for events
    // -------------------------------------------------------------------------
    /**
     * Register a handler to be called every time an event is emitted.
     * Returns a cleanup function — call it to stop listening.
     *
     * IMPORTANT: always call the returned cleanup in useEffect's return:
     *
     *   useEffect(() => {
     *     const unsubscribe = EventBus.getInstance().subscribe(handler)
     *     return unsubscribe  // ← React calls this on component unmount
     *   }, [handler])
     *
     * If you don't clean up:
     *   - The handler keeps firing even after the component is gone
     *   - Every time the component mounts again, a NEW listener is added
     *   - After 10 mount/unmount cycles you have 10 listeners all firing
     *   - This is a classic memory leak and causes duplicate event handling
     *
     * @param handler - Function to call when any TodoEvent is emitted
     * @returns       A cleanup function — call it to remove this listener
     */
    subscribe(handler) {
        // We can't pass handler directly to addEventListener because we need
        // to unwrap the CustomEvent and hand the typed detail to the handler.
        //
        // This wrapper:
        //   1. Receives the raw DOM Event
        //   2. Casts it to CustomEvent<TodoEvent> — safe because we only dispatch
        //      CustomEvents with TodoEvent payloads on this CHANNEL
        //   3. Extracts .detail — our typed TodoEvent
        //   4. Passes it to the caller's handler
        const listener = (e) => {
            handler(e.detail);
        };
        window.addEventListener(CHANNEL, listener);
        // Return the cleanup function.
        // Captures "listener" in closure — always removes the exact right handler.
        // Arrow function because we don't need "this" binding here.
        return () => window.removeEventListener(CHANNEL, listener);
    }
}
//# sourceMappingURL=eventbus.js.map