import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

async function runCmd(cmd: string) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const { stdout } = await promisify(exec)(cmd);
  return stdout;
}

export type PipelineRunSummary = {
  id: string;
  status: string;
  startedAt: string;
  duration?: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const oido = getOido();
    const { name } = await params;
    const runId = req.nextUrl.searchParams.get('runId');
    const cmd = runId
      ? `${oido} pipelines logs ${name} ${runId}`
      : `${oido} pipelines logs ${name}`;
    const stdout = await runCmd(cmd).catch(() => '');
    return NextResponse.json({ output: stdout });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
