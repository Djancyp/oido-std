// lib/waiters.ts
// Shared in-memory store for pending ask_user_question waiters.
// Both the stream route (writer) and the respond route (reader) import from here.
// Because Next.js runs in a single Node process, this module-level map is shared
// across all route handlers in the same process instance.

export type Waiter = {
  // Resolves with the user's answer, or rejects if the conversation times out.
  resolve: (answer: string) => void;
  reject: (reason?: string) => void;
};

// conversationId → waiter
export const waiters = new Map<number, Waiter>();
