import { NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

async function runCmd(cmd: string) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  const { stdout } = await execAsync(cmd);
  return stdout;
}

export type ChannelStatus = {
  name: string;
  status: string;
  running: boolean;
  pid?: number;
};

export async function GET() {
  try {
    const oido = getOido();
    const stdout = await runCmd(`${oido} channel status --json`);
    const statuses: ChannelStatus[] = JSON.parse(stdout);
    return NextResponse.json<ChannelStatus[]>(statuses);
  } catch (err: any) {
    console.error('Error in GET /api/channels/status:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch channel status' }, { status: 500 });
  }
}
