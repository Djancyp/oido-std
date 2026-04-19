import { NextResponse } from 'next/server';
import { runCmd } from '../agents/route';

export const runtime = 'nodejs';

export type Sessions = Session[];

export interface Session {
  id: string;
  model: string;
  firstPrompt: string;
  agentId: string;
  tabId: string;
  updatedAt: string;
  path: string;
  recordCount: number;
}
/* =========================
   GET: List models
========================= */
export async function GET() {
  try {
    const oido = process.env.OIDO_PATH;
    if (!oido) throw new Error('OIDO_PATH is not defined');

    const stdout = await runCmd(`${oido} session list --json`);
    const sessions: Sessions = JSON.parse(stdout);

    return NextResponse.json<Sessions>(sessions);
  } catch (err: any) {
    console.error('Error in GET /api/models:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch models' }, { status: 500 });
  }
}
