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

    const stdout = await runCmd(`${oido} sessions list --json`);
    let sessions: Sessions = [];
    try { sessions = JSON.parse(stdout.trim()); } catch {}

    return NextResponse.json<Sessions>(sessions);
  } catch (err: any) {
    console.error('Error in GET /api/sessions:', err);
    return NextResponse.json([], { status: 200 });
  }
}
