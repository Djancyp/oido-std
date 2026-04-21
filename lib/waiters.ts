// lib/waiters.ts
// Shared in-memory store for pending ask_user_question waiters.
// Stored on globalThis so Turbopack/webpack module-splitting doesn't produce
// separate Map instances between the stream route and the respond route.

export type Waiter = {
  resolve: (answer: string) => void;
  reject: (reason?: string) => void;
};

declare global {
  // eslint-disable-next-line no-var
  var __oido_waiters: Map<number, Waiter> | undefined;
}

globalThis.__oido_waiters ??= new Map<number, Waiter>();

export const waiters: Map<number, Waiter> = globalThis.__oido_waiters;
