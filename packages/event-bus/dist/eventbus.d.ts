import type { TodoEvent } from "./events";
export declare class EventBus {
    private static instance;
    private constructor();
    static getInstance(): EventBus;
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
    emit(event: TodoEvent): void;
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
    subscribe(handler: (event: TodoEvent) => void): () => void;
}
