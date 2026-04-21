import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

export type PipelineSchedule = {
  id: string;
  pipeline: string;
  cron: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
};

async function runCmd(cmd: string) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const { stdout } = await promisify(exec)(cmd);
  return stdout;
}

export async function GET() {
  try {
    const oido = getOido();
    const { stdout } = await import('child_process').then(async ({ exec }) => {
      const { promisify } = await import('util');
      return promisify(exec)(`${oido} pipelines schedule list`).catch(() => ({ stdout: '[]' }));
    });
    const trimmed = stdout.trim();
    if (!trimmed || !trimmed.startsWith('[')) return NextResponse.json([]);
    return NextResponse.json(JSON.parse(trimmed));
  } catch {
    return NextResponse.json([]);
  }
}

/* POST: schedule add --pipeline <name> --cron <expr> */
export async function POST(req: NextRequest) {
  try {
    const oido = getOido();
    const { pipeline, cron } = await req.json();
    if (!pipeline) return NextResponse.json({ error: 'pipeline is required' }, { status: 400 });
    if (!cron) return NextResponse.json({ error: 'cron is required' }, { status: 400 });
    const stdout = await runCmd(`${oido} pipelines schedule add --pipeline ${pipeline} --cron "${cron}"`);
    return NextResponse.json({ success: true, output: stdout });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* DELETE: schedule remove <id> */
export async function DELETE(req: NextRequest) {
  try {
    const oido = getOido();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const stdout = await runCmd(`${oido} pipelines schedule remove ${id}`);
    return NextResponse.json({ success: true, output: stdout });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
