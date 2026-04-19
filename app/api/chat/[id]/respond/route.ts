// app/api/chat/[id]/respond/route.ts
import { NextRequest } from 'next/server';
import { waiters } from '@/lib/waiters';

type RespondRequest = {
  answer: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const conversationId = Number(id);
  if (!Number.isFinite(conversationId) || conversationId <= 0) {
    return Response.json({ error: 'invalid conversation id' }, { status: 400 });
  }

  const body: RespondRequest = await req.json().catch(() => ({}));
  if (!body.answer?.trim()) {
    return Response.json({ error: 'answer is required' }, { status: 400 });
  }

  const waiter = waiters.get(conversationId);
  if (!waiter) {
    return Response.json(
      { error: 'no pending question for this conversation' },
      { status: 404 }
    );
  }

  waiter.resolve(body.answer);
  waiters.delete(conversationId);

  return Response.json({ status: 'answer delivered' });
}
