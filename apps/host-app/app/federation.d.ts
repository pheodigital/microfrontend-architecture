// federation.d.ts — TypeScript declarations for federated modules.
//
// THE PROBLEM this file solves:
//   When host-app does: import TodoApp from 'remoteApp/TodoApp'
//   TypeScript panics: "Cannot find module 'remoteApp/TodoApp'"
//
//   That makes sense — 'remoteApp/TodoApp' is NOT in node_modules.
//   It only exists at RUNTIME in the browser, loaded from port 3001.
//   TypeScript runs at build time and has no idea it will exist.
//
// THE SOLUTION:
//   We use "declare module" to tell TypeScript:
//   "Trust me. This module exists at runtime. Here are its types."
//   TypeScript stops complaining and gives you full autocomplete.
//
// This file grows with each PR:
//   PR-06 → declare module 'remoteApp/TodoApp'
//   PR-07 → declare module 'remoteApp/todoStore'
//   PR-08 → declare module 'remoteApp/EventBus'

// Empty for now — declarations added as we wire up each federated module.
export {}
