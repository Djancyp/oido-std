import { NextResponse } from 'next/server';
import { runCmd } from '../agents/route';

export const runtime = 'nodejs';

/* =========================
   GET: List models
========================= */
export async function GET() {
  try {
    const oido = process.env.OIDO_PATH;
    if (!oido) throw new Error('OIDO_PATH is not defined');

    const stdout = await runCmd(`${oido} models list --json`);
    let models: ModelResponse = { activeProviders: [], providers: [], total: 0 };
    try { models = JSON.parse(stdout.trim()); } catch {}

    return NextResponse.json<ModelResponse>(models);
  } catch (err: any) {
    console.error('Error in GET /api/models:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch models' }, { status: 500 });
  }
}

export interface ModelResponse {
  activeProviders: string[];
  providers: Provider[];
  total: number;
}

export interface Provider {
  provider: string;
  account?: string;
  tier?: string;
  models: Model[];
}

export interface Model {
  id: string;
  displayName: string;
  tier: string;
  status: string;
  description?: string;
  contextSize?: number;
  capabilities?: string[];
  resetTime?: string;
}
