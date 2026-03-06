// Server Component — the standalone page for remote-app.
//
// This page exists so you can open http://localhost:3001 directly
// and use the full Todo app without host-app running at all.
//
// This is a critical microfrontend discipline:
//   Every MFE must work in ISOLATION.
//   It must never require the host app to function.
//   Federation is an enhancement — not a dependency.
//
// WHY IS THIS A SERVER COMPONENT IF TodoApp IS A CLIENT COMPONENT?
// -----------------------------------------------------------------
// A Server Component CAN render Client Components as children.
// The boundary flows ONE WAY: server → client.
//
// This page (Server) renders on the server → produces HTML shell.
// TodoApp (Client) is included as a reference in that HTML.
// The browser downloads TodoApp's JS bundle and hydrates it.
//
// This gives us the best of both worlds:
//   - Instant HTML from the server (fast first paint)
//   - Full interactivity from the client bundle (hooks, events)

import TodoApp from "../../host-app/components/TodoApp";

export default function RemotePage() {
  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Todo MFE</h1>
        <p className="mt-1 text-sm text-slate-500">
          Standalone mode — running independently on port 3001. In PR-06 this
          component will also be served to host-app via Module Federation.
        </p>
      </div>

      {/* The real TodoApp — fully functional */}
      <TodoApp />
    </div>
  );
}
