# TodoFlow — PR-01: Monorepo Skeleton

> **Current state:** Project scaffold only. No application code yet.
> Follow the PRs in order — each one builds on the last.

---

## What exists after this PR

```
todoflow/
├── apps/
│   ├── host-app/           ← shell app placeholder (port 3000)
│   └── remote-app/         ← todo MFE placeholder (port 3001)
├── packages/
│   ├── mini-store/         ← hand-rolled state primitive (empty src/)
│   └── event-bus/          ← typed event system (empty src/)
├── package.json            ← root workspace, turbo scripts
├── pnpm-workspace.yaml     ← declares which folders are packages
├── turbo.json              ← build pipeline and task ordering
└── tsconfig.base.json      ← shared TypeScript compiler config
```

---

## How to verify this PR works

```bash
# 1. Install all dependencies across the entire monorepo in one shot
pnpm install

# 2. Check that pnpm created symlinks to local packages
ls node_modules/@todoflow
# Should show: event-bus  mini-store

# 3. Turborepo should run without errors (nothing to build yet, that's fine)
pnpm build

# 4. TypeScript should type-check cleanly (nothing to check yet, that's fine)
pnpm type-check
```

---

## Why this order matters

We set up the scaffold BEFORE writing application code for the same reason
you put on a foundation before building walls. Every subsequent PR has a
clear, predictable home for its files. No "where does this go?" confusion.

---

## Next: PR-02 — The Mini Store Primitive

PR-02 fills in `packages/mini-store/src/` with the observable store:
a 30-line JavaScript primitive that is the foundation of all state management.
